import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

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

  // Helper functions
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
