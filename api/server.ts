import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

// Define station coordinates for Jerusalem light rail
interface StationCoordinates {
  name: string;
  lat: number;
  lon: number;
}

// Light rail stations with coordinates
const stationCoordinates: StationCoordinates[] = [
  { name: "העיר העתיקה - שער שכם", lat: 31.7839, lon: 35.2332 },
  { name: "העיר העתיקה - שער יפו", lat: 31.777, lon: 35.2275 },
  { name: "הדוידקה", lat: 31.7821, lon: 35.2225 },
  { name: "ככר ספרא", lat: 31.779, lon: 35.223 },
  { name: "שוק מחנה יהודה", lat: 31.7849, lon: 35.2124 },
  { name: "מחנה יהודה", lat: 31.7863, lon: 35.206 },
  { name: "מרכז העיר", lat: 31.7825, lon: 35.2178 },
  { name: "הר הרצל", lat: 31.7712, lon: 35.1797 },
  { name: "יפו מרכז", lat: 31.7841, lon: 35.2098 },
  { name: "גבעת רם", lat: 31.7735, lon: 35.1986 },
  { name: "בי''ח הדסה עין כרם", lat: 31.7662, lon: 35.1597 },
  { name: "הר נוף", lat: 31.7874, lon: 35.1868 },
  { name: "גבעת שאול", lat: 31.7918, lon: 35.1934 },
  { name: "כיכר דניה", lat: 31.7951, lon: 35.2013 },
  { name: "מרכז", lat: 31.7756, lon: 35.2173 },
  { name: "תחנה מרכזית", lat: 31.7884, lon: 35.2032 },
  { name: "שמעון הצדיק", lat: 31.7931, lon: 35.2291 },
  { name: "שד' אשכול/בר לב", lat: 31.7983, lon: 35.2343 },
  { name: "מעלות דפנה", lat: 31.8012, lon: 35.2303 },
  { name: "גבעת המבתר", lat: 31.8051, lon: 35.2361 },
  { name: "סיירת דוכיפת", lat: 31.8091, lon: 35.2394 },
  { name: "פסגת זאב מרכז", lat: 31.8161, lon: 35.2402 },
  { name: "פסגת זאב מזרח", lat: 31.8222, lon: 35.2414 },
  { name: "נווה יעקב", lat: 31.8287, lon: 35.2404 },
  { name: "נווה יעקב צפון", lat: 31.8311, lon: 35.2363 },
  { name: "קניון מלחה", lat: 31.7518, lon: 35.1879 },
  { name: "גן החיות", lat: 31.7471, lon: 35.1775 },
];

// Known landmarks for fallback only - will be used only if geocoding API fails
const knownLandmarks: Record<string, { lat: number; lon: number }> = {
  "הכותל המערבי": { lat: 31.7767, lon: 35.2345 },
  כותל: { lat: 31.7767, lon: 35.2345 },
  הכותל: { lat: 31.7767, lon: 35.2345 },
  "הר הבית": { lat: 31.7781, lon: 35.2356 },
  "כיפת הסלע": { lat: 31.7781, lon: 35.2356 },
  "מחנה יהודה": { lat: 31.7846, lon: 35.2124 },
  "שוק מחנה יהודה": { lat: 31.7846, lon: 35.2124 },
  "העיר העתיקה": { lat: 31.7767, lon: 35.2315 },
  "הרובע היהודי": { lat: 31.7737, lon: 35.2323 },
  "יד ושם": { lat: 31.7743, lon: 35.1751 },
  "מוזיאון ישראל": { lat: 31.7716, lon: 35.2041 },
  הכנסת: { lat: 31.7752, lon: 35.2082 },
  "קניון מלחה": { lat: 31.7518, lon: 35.1879 },
  "גן החיות התנכי": { lat: 31.7471, lon: 35.1775 },
  ממילא: { lat: 31.7776, lon: 35.2242 },
  "מלון המלך דוד": { lat: 31.7762, lon: 35.2259 },
};

const handler = createMcpHandler((server) => {
  // Fetch station IDs
  server.tool("get-stations", {}, async () => {
    try {
      const response = await fetch(
        "https://www.cfir.co.il/__svws__/SVService.asmx/GetSearchStations",
        {
          method: "POST",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Content-Type": "application/json",
            Origin: "https://www.cfir.co.il",
            Pragma: "no-cache",
            Referer: "https://www.cfir.co.il/",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
          },
          body: "{}",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch stations: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: [{ type: "text", text: JSON.stringify(data.d) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch stations: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  });

  // Find station ID by name
  server.tool(
    "find-station",
    {
      stationName: z.string().describe("The Hebrew name of the station"),
    },
    async ({ stationName }) => {
      try {
        const response = await fetch(
          "https://www.cfir.co.il/__svws__/SVService.asmx/GetSearchStations",
          {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
              Origin: "https://www.cfir.co.il",
              Referer: "https://www.cfir.co.il/",
            },
            body: "{}",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch stations: ${response.status}`);
        }

        const data = await response.json();
        const stations = data.d;

        const station = stations.find((s: any) => s.Text === stationName);

        if (!station) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  found: false,
                  message: `לא נמצאה תחנה בשם "${stationName}"`,
                  suggestions: stations.map((s: any) => s.Text),
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                found: true,
                station: {
                  name: station.Text,
                  id: station.Value,
                },
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to find station: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get train schedules between stations
  server.tool(
    "get-train-schedule",
    {
      fromStationId: z
        .string()
        .or(z.number())
        .describe("ID of the departure station"),
      toStationId: z
        .string()
        .or(z.number())
        .describe("ID of the arrival station"),
      date: z.string().describe("Date in format YYYYMMDD"),
      time: z.string().describe("Time in format HHMM"),
    },
    async ({ fromStationId, toStationId, date, time }) => {
      try {
        const response = await fetch(
          "https://www.cfir.co.il/__svws__/SVService.asmx/SearchTrains",
          {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
              Origin: "https://www.cfir.co.il",
              Referer: `https://www.cfir.co.il/train-search-result/?FSID=${fromStationId}&TSID=${toStationId}&Date=${date}&Hour=${time}&IDT=true&ILT=false`,
            },
            body: JSON.stringify({
              fsid: String(fromStationId),
              tsid: String(toStationId),
              date: String(date),
              hour: String(time),
              idt: "true",
              ilt: "false",
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch schedule: ${response.status}`);
        }

        const data = await response.json();

        if (!data.d || !data.d.TrainTimes) {
          throw new Error("No train times found in the response");
        }

        // Format the response in Hebrew
        const result = {
          fromStation: data.d.FromStationName,
          toStation: data.d.ToStationName,
          travelTime: data.d.TravelTime,
          countStations: data.d.CountStations,
          lastTrainTime: data.d.LastTrainTime,
          trainTimes: data.d.TrainTimes.slice(0, 10), // Return the first 10 times for brevity
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch schedule: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Helper tool to search train schedule using Hebrew station names
  server.tool(
    "search-trains-by-name",
    {
      fromStationName: z
        .string()
        .describe("Hebrew name of the departure station"),
      toStationName: z.string().describe("Hebrew name of the arrival station"),
      date: z
        .string()
        .optional()
        .describe("Date in format YYYYMMDD (default: today)"),
      time: z
        .string()
        .optional()
        .describe("Time in format HHMM (default: current time)"),
      clientTime: z
        .string()
        .optional()
        .describe("Client's current time in ISO format"),
    },
    async ({ fromStationName, toStationName, date, time, clientTime }) => {
      try {
        // Get current date and time if not provided
        let now;

        // If user is asking about "הרכבות הקרובות" and client time is provided, use it
        if (clientTime) {
          now = new Date(clientTime);
          console.log(`Using client time: ${now.toISOString()}`);
        } else {
          now = new Date();
        }

        const formattedDate =
          date ||
          now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, "0") +
            String(now.getDate()).padStart(2, "0");
        const formattedTime =
          time ||
          String(now.getHours()).padStart(2, "0") +
            String(now.getMinutes()).padStart(2, "0");

        console.log(`מחפש רכבות מ-${fromStationName} ל-${toStationName}`, {
          date: formattedDate,
          time: formattedTime,
        });

        // Step 1: Get all stations
        const stationsResponse = await fetch(
          "https://www.cfir.co.il/__svws__/SVService.asmx/GetSearchStations",
          {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
              Origin: "https://www.cfir.co.il",
              Referer: "https://www.cfir.co.il/",
            },
            body: "{}",
          }
        );

        if (!stationsResponse.ok) {
          throw new Error(
            `Failed to fetch stations: ${stationsResponse.status}`
          );
        }

        const stationsData = await stationsResponse.json();
        const stations = stationsData.d;

        // Step 2: Find station IDs
        const fromStation = stations.find(
          (s: any) => s.Text === fromStationName
        );
        const toStation = stations.find((s: any) => s.Text === toStationName);

        if (!fromStation) {
          const suggestions = getTopSimilarStations(fromStationName, stations);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `לא נמצאה תחנה בשם "${fromStationName}"`,
                  suggestions: suggestions.map((s: any) => s.Text),
                }),
              },
            ],
          };
        }

        if (!toStation) {
          const suggestions = getTopSimilarStations(toStationName, stations);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: `לא נמצאה תחנה בשם "${toStationName}"`,
                  suggestions: suggestions.map((s: any) => s.Text),
                }),
              },
            ],
          };
        }

        // Step 3: Get schedule
        const scheduleResponse = await fetch(
          "https://www.cfir.co.il/__svws__/SVService.asmx/SearchTrains",
          {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
              Origin: "https://www.cfir.co.il",
              Referer: `https://www.cfir.co.il/train-search-result/?FSID=${fromStation.Value}&TSID=${toStation.Value}&Date=${formattedDate}&Hour=${formattedTime}&IDT=true&ILT=false`,
            },
            body: JSON.stringify({
              fsid: String(fromStation.Value),
              tsid: String(toStation.Value),
              date: String(formattedDate),
              hour: String(formattedTime),
              idt: "true",
              ilt: "false",
            }),
          }
        );

        if (!scheduleResponse.ok) {
          throw new Error(
            `Failed to fetch schedule: ${scheduleResponse.status}`
          );
        }

        const scheduleData = await scheduleResponse.json();

        if (!scheduleData.d || !scheduleData.d.TrainTimes) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  error: "לא נמצאו רכבות זמינות במסלול זה בזמן שביקשת",
                  fromStation: fromStationName,
                  toStation: toStationName,
                  date: formattedDate,
                  time: formattedTime,
                }),
              },
            ],
          };
        }

        // Format the response in Hebrew
        const result = {
          fromStation: scheduleData.d.FromStationName,
          toStation: scheduleData.d.ToStationName,
          travelTime: scheduleData.d.TravelTime,
          countStations: scheduleData.d.CountStations,
          lastTrainTime: scheduleData.d.LastTrainTime,
          trainTimes: scheduleData.d.TrainTimes.slice(0, 10), // Return the first 10 times for brevity
          requestInfo: {
            date: formattedDate,
            time: formattedTime,
            dayOfWeek: getDayOfWeekInHebrew(now.getDay()),
            currentTime: now.toLocaleTimeString("he-IL"),
          },
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to search trains: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Find the nearest station to a landmark
  server.tool(
    "find-nearest-station-to-landmark",
    {
      landmark: z
        .string()
        .describe("The place/address/landmark name in Hebrew"),
      time: z
        .string()
        .optional()
        .describe("Time in format HHMM (default: current time)"),
      date: z
        .string()
        .optional()
        .describe("Date in format YYYYMMDD (default: today)"),
      clientTime: z
        .string()
        .optional()
        .describe("Client's current time in ISO format"),
    },
    async ({ landmark, time, date, clientTime }) => {
      try {
        console.log(`Searching for location: ${landmark}`);

        // Get location coordinates using OpenStreetMap
        let locationCoordinates: { lat: number; lon: number } | null = null;
        const normalizedLandmark = landmark.trim().toLowerCase();

        // Always try to use Nominatim API first for any address or location
        try {
          // Always append Jerusalem, Israel to ensure locality context
          let searchQuery = `${landmark}`;
          if (
            !searchQuery.includes("ירושלים") &&
            !searchQuery.includes("jerusalem")
          ) {
            searchQuery += ", Jerusalem, Israel";
          }

          const encodedQuery = encodeURIComponent(searchQuery);
          const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1&addressdetails=1`;

          console.log(`Querying Nominatim: ${nominatimUrl}`);

          const nominatimResponse = await fetch(nominatimUrl, {
            headers: {
              "User-Agent": "JerusalemLightRailMCPServer/1.0",
              "Accept-Language": "he,en",
            },
          });

          if (!nominatimResponse.ok) {
            throw new Error(`Nominatim API error: ${nominatimResponse.status}`);
          }

          const results = await nominatimResponse.json();

          if (results && results.length > 0) {
            locationCoordinates = {
              lat: parseFloat(results[0].lat),
              lon: parseFloat(results[0].lon),
            };
            console.log(
              `Found coordinates via Nominatim: ${locationCoordinates.lat}, ${locationCoordinates.lon}`
            );

            // Check if the found location is actually in Jerusalem
            const addressDetails = results[0].address;
            if (addressDetails) {
              const isInJerusalem =
                (addressDetails.city &&
                  (addressDetails.city.includes("Jerusalem") ||
                    addressDetails.city.includes("ירושלים"))) ||
                (addressDetails.county &&
                  (addressDetails.county.includes("Jerusalem") ||
                    addressDetails.county.includes("ירושלים")));

              if (!isInJerusalem) {
                console.log(
                  "Warning: Found location might not be in Jerusalem"
                );
              }
            }
          }
        } catch (error) {
          console.error("Error with Nominatim:", error);
          // Will continue with fallback
        }

        // Only use known landmarks as fallback if API fails
        if (!locationCoordinates) {
          for (const [key, coords] of Object.entries(knownLandmarks)) {
            if (
              normalizedLandmark.includes(key.toLowerCase()) ||
              key.toLowerCase().includes(normalizedLandmark)
            ) {
              locationCoordinates = coords;
              console.log(
                `Using fallback coordinates for known landmark: ${key}`
              );
              break;
            }
          }
        }

        // If we still couldn't find coordinates, return error
        if (!locationCoordinates) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  found: false,
                  message: `לא הצלחתי למצוא את המיקום "${landmark}" בירושלים. נסה לציין כתובת מדויקת יותר.`,
                }),
              },
            ],
          };
        }

        // Find the nearest station by calculating distance to all stations
        let nearestStation: StationCoordinates | null = null;
        let shortestDistance = Number.MAX_VALUE;
        let approximateWalkTimeMinutes = 0;
        let distanceMeters = 0;

        stationCoordinates.forEach((station) => {
          const distance = calculateDistance(
            locationCoordinates!.lat,
            locationCoordinates!.lon,
            station.lat,
            station.lon
          );

          if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestStation = station;
            distanceMeters = Math.round(distance * 1000); // Convert km to meters
            approximateWalkTimeMinutes = Math.round(distanceMeters / 80); // Assuming 80 meters per minute walking speed
          }
        });

        if (!nearestStation) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  found: false,
                  message: `לא הצלחתי למצוא תחנת רכבת קלה קרובה ל"${landmark}"`,
                }),
              },
            ],
          };
        }

        // Format the distance and walk time for display
        const distanceFormatted =
          distanceMeters >= 1000
            ? `${(distanceMeters / 1000).toFixed(1)} ק"מ`
            : `${distanceMeters} מטר`;

        const walkTimeFormatted =
          approximateWalkTimeMinutes >= 60
            ? `${Math.floor(approximateWalkTimeMinutes / 60)} שעות ו-${
                approximateWalkTimeMinutes % 60
              } דקות הליכה`
            : `${approximateWalkTimeMinutes} דקות הליכה`;

        // Get current date and time if not provided
        let now;
        if (clientTime) {
          now = new Date(clientTime);
        } else {
          now = new Date();
        }

        const formattedDate =
          date ||
          now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, "0") +
            String(now.getDate()).padStart(2, "0");
        const formattedTime =
          time ||
          String(now.getHours()).padStart(2, "0") +
            String(now.getMinutes()).padStart(2, "0");

        // Get all stations to find the ID of the nearest station
        const stationsResponse = await fetch(
          "https://www.cfir.co.il/__svws__/SVService.asmx/GetSearchStations",
          {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
              Origin: "https://www.cfir.co.il",
              Referer: "https://www.cfir.co.il/",
            },
            body: "{}",
          }
        );

        if (!stationsResponse.ok) {
          throw new Error(
            `Failed to fetch stations: ${stationsResponse.status}`
          );
        }

        const stationsData = await stationsResponse.json();
        const stations = stationsData.d;

        // Find the station by name
        const station = stations.find(
          (s: any) =>
            s.Text === nearestStation!.name ||
            s.Text.includes(nearestStation!.name)
        );

        if (!station) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  found: true,
                  location: landmark,
                  nearestStation: nearestStation.name,
                  distance: distanceFormatted,
                  walkTime: walkTimeFormatted,
                  coordinates: {
                    location: locationCoordinates,
                    station: {
                      lat: nearestStation.lat,
                      lon: nearestStation.lon,
                    },
                  },
                  error: "לא ניתן למצוא מידע על לוח הזמנים של התחנה",
                }),
              },
            ],
          };
        }

        // Get upcoming trains from this station
        // We'll get trains to Central Station as a default destination
        const centralStation = stations.find(
          (s: any) => s.Text === "תחנה מרכזית" || s.Text.includes("מרכזית")
        );

        const scheduleResponse = await fetch(
          "https://www.cfir.co.il/__svws__/SVService.asmx/SearchTrains",
          {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
              Origin: "https://www.cfir.co.il",
              Referer: `https://www.cfir.co.il/train-search-result/?FSID=${
                station.Value
              }&TSID=${
                centralStation ? centralStation.Value : ""
              }&Date=${formattedDate}&Hour=${formattedTime}&IDT=true&ILT=false`,
            },
            body: JSON.stringify({
              fsid: String(station.Value),
              tsid: centralStation ? String(centralStation.Value) : "",
              date: String(formattedDate),
              hour: String(formattedTime),
              idt: "true",
              ilt: "false",
            }),
          }
        );

        // Format the response
        let scheduleInfo = {};
        let hasSchedule = false;

        if (scheduleResponse.ok) {
          const scheduleData = await scheduleResponse.json();
          if (scheduleData.d && scheduleData.d.TrainTimes) {
            hasSchedule = true;
            scheduleInfo = {
              fromStation: scheduleData.d.FromStationName,
              toStation: scheduleData.d.ToStationName,
              travelTime: scheduleData.d.TravelTime,
              trainTimes: scheduleData.d.TrainTimes.slice(0, 5), // Return the first 5 times
            };
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                found: true,
                location: landmark,
                nearestStation: nearestStation.name,
                distance: distanceFormatted,
                walkTime: walkTimeFormatted,
                stationId: station.Value,
                hasSchedule,
                scheduleInfo: hasSchedule ? scheduleInfo : null,
                coordinates: {
                  location: locationCoordinates,
                  station: { lat: nearestStation.lat, lon: nearestStation.lon },
                },
                requestInfo: {
                  date: formattedDate,
                  time: formattedTime,
                  dayOfWeek: getDayOfWeekInHebrew(now.getDay()),
                  currentTime: now.toLocaleTimeString("he-IL"),
                },
              }),
            },
          ],
        };
      } catch (error) {
        console.error("Error in find-nearest-station-to-landmark:", error);
        return {
          content: [
            {
              type: "text",
              text: `Failed to find nearest station: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Helper functions
  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Haversine formula to calculate distance between two points on Earth
    const R = 6371; // Radius of the Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  function getTopSimilarStations(
    stationName: string,
    stations: any[],
    limit = 5
  ) {
    return stations
      .map((station) => ({
        ...station,
        similarity: calculateSimilarity(stationName, station.Text),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  function calculateSimilarity(s1: string, s2: string) {
    // Simple case-insensitive substring check
    if (s2.toLowerCase().includes(s1.toLowerCase())) return 1;
    if (s1.toLowerCase().includes(s2.toLowerCase())) return 0.9;

    // Compute Levenshtein distance
    const track = Array(s2.length + 1)
      .fill(null)
      .map(() => Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i += 1) {
      track[0][i] = i;
    }

    for (let j = 0; j <= s2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }

    const maxLength = Math.max(s1.length, s2.length);
    const distance = track[s2.length][s1.length];

    // Return similarity as a value between 0 and 1
    return 1 - distance / maxLength;
  }

  function getDayOfWeekInHebrew(day: number) {
    const days = [
      "יום ראשון",
      "יום שני",
      "יום שלישי",
      "יום רביעי",
      "יום חמישי",
      "יום שישי",
      "יום שבת",
    ];
    return days[day];
  }
});

export { handler as GET, handler as POST, handler as DELETE };
