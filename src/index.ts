import { FastMCP, UserError } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "Jerusalem Light Rail Server",
  version: "1.0.0",
  instructions: `
    This server provides tools to get information about the Jerusalem light rail system.
    It can convert Hebrew station names to IDs and fetch schedules between stations.
    
    Example usage (in Hebrew):
    "הצג לי את זמן הרכבות הקרובות מנווה יעקב צפון לסיירת דוכיפת"
  `,
});

// Fetch station IDs
server.addTool({
  name: "get-stations",
  description: "Get all light rail stations and their IDs",
  execute: async () => {
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
        throw new UserError(`Failed to fetch stations: ${response.status}`);
      }

      const data = await response.json();
      return JSON.stringify(data.d);
    } catch (error) {
      throw new UserError(
        `Failed to fetch stations: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

// Find station ID by name
server.addTool({
  name: "find-station",
  description: "Find a station ID by its Hebrew name",
  parameters: z.object({
    stationName: z.string().describe("The Hebrew name of the station"),
  }),
  execute: async (args) => {
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
        throw new UserError(`Failed to fetch stations: ${response.status}`);
      }

      const data = await response.json();
      const stations = data.d;

      const station = stations.find((s: any) => s.Text === args.stationName);

      if (!station) {
        return JSON.stringify({
          found: false,
          message: `לא נמצאה תחנה בשם "${args.stationName}"`,
          suggestions: stations.map((s: any) => s.Text),
        });
      }

      return JSON.stringify({
        found: true,
        station: {
          name: station.Text,
          id: station.Value,
        },
      });
    } catch (error) {
      throw new UserError(
        `Failed to find station: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

// Get train schedules between stations
server.addTool({
  name: "get-train-schedule",
  description: "Get the train schedule between two stations",
  parameters: z.object({
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
  }),
  execute: async (args) => {
    try {
      const { fromStationId, toStationId, date, time } = args;

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
        throw new UserError(`Failed to fetch schedule: ${response.status}`);
      }

      const data = await response.json();

      if (!data.d || !data.d.TrainTimes) {
        throw new UserError("No train times found in the response");
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

      return JSON.stringify(result);
    } catch (error) {
      throw new UserError(
        `Failed to fetch schedule: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

// Helper tool to search train schedule using Hebrew station names
server.addTool({
  name: "search-trains-by-name",
  description:
    "Search for trains between two stations using Hebrew station names",
  parameters: z.object({
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
  }),
  execute: async (args, { log }) => {
    try {
      const { fromStationName, toStationName } = args;

      // Get current date and time if not provided
      let now;

      // If user is asking about "הרכבות הקרובות" and client time is provided, use it
      if (args.clientTime) {
        now = new Date(args.clientTime);
        log.info(`Using client time: ${now.toISOString()}`);
      } else {
        now = new Date();
      }

      const date =
        args.date ||
        now.getFullYear() +
          String(now.getMonth() + 1).padStart(2, "0") +
          String(now.getDate()).padStart(2, "0");
      const time =
        args.time ||
        String(now.getHours()).padStart(2, "0") +
          String(now.getMinutes()).padStart(2, "0");

      log.info(`מחפש רכבות מ-${fromStationName} ל-${toStationName}`, {
        date,
        time,
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
        throw new UserError(
          `Failed to fetch stations: ${stationsResponse.status}`
        );
      }

      const stationsData = await stationsResponse.json();
      const stations = stationsData.d;

      // Step 2: Find matching stations
      const fromStation = stations.find((s: any) => s.Text === fromStationName);
      const toStation = stations.find((s: any) => s.Text === toStationName);

      if (!fromStation) {
        return `לא נמצאה תחנת מוצא בשם "${fromStationName}". תחנות אפשריות: ${stations
          .slice(0, 5)
          .map((s: any) => s.Text)
          .join(", ")}...`;
      }

      if (!toStation) {
        return `לא נמצאה תחנת יעד בשם "${toStationName}". תחנות אפשריות: ${stations
          .slice(0, 5)
          .map((s: any) => s.Text)
          .join(", ")}...`;
      }

      log.info(
        `נמצאו תחנות - מוצא: ${fromStation.Text} (ID: ${fromStation.Value}), יעד: ${toStation.Text} (ID: ${toStation.Value})`
      );

      // Step 3: Get train schedules
      const scheduleResponse = await fetch(
        "https://www.cfir.co.il/__svws__/SVService.asmx/SearchTrains",
        {
          method: "POST",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            Origin: "https://www.cfir.co.il",
            Referer: `https://www.cfir.co.il/train-search-result/?FSID=${fromStation.Value}&TSID=${toStation.Value}&Date=${date}&Hour=${time}&IDT=true&ILT=false`,
          },
          body: JSON.stringify({
            fsid: String(fromStation.Value),
            tsid: String(toStation.Value),
            date: String(date),
            hour: String(time),
            idt: "true",
            ilt: "false",
          }),
        }
      );

      if (!scheduleResponse.ok) {
        throw new UserError(
          `Failed to fetch schedule: ${scheduleResponse.status}`
        );
      }

      const scheduleData = await scheduleResponse.json();

      if (
        !scheduleData.d ||
        !scheduleData.d.TrainTimes ||
        scheduleData.d.TrainTimes.length === 0
      ) {
        return `לא נמצאו רכבות מתחנת ${fromStationName} לתחנת ${toStationName} בתאריך ושעה שנבחרו`;
      }

      // Step 4: Format the response nicely in Hebrew
      const trainTimes = scheduleData.d.TrainTimes.slice(0, 10); // Limit to 10 trains

      // Format the date for display
      const displayDate = `${date.slice(6, 8)}/${date.slice(4, 6)}/${date.slice(
        0,
        4
      )}`;

      let result = `# זמני הרכבות מ${fromStationName} ל${toStationName}\n`;
      result += `## תאריך: ${displayDate} | שעה: ${time.slice(
        0,
        2
      )}:${time.slice(2, 4)}\n\n`;
      result += `זמן נסיעה: ${scheduleData.d.TravelTime} דקות\n`;
      result += `מספר תחנות בדרך: ${scheduleData.d.CountStations}\n\n`;
      result += `| שעת יציאה | שעת הגעה | עומס |\n`;
      result += `|------------|------------|-------|\n`;

      trainTimes.forEach((train: any) => {
        const loadLevel =
          train.Omes === 1 ? "נמוך" : train.Omes === 2 ? "בינוני" : "גבוה";
        result += `| ${train.DepartureTime} | ${train.ArrivalTime} | ${loadLevel} |\n`;
      });

      result += `\nהרכבת האחרונה יוצאת בשעה ${scheduleData.d.LastTrainTime}`;

      return result;
    } catch (error) {
      throw new UserError(
        `תקלה בחיפוש רכבות: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
});

// Start the server
server.start({
  transportType: "stdio", // Use stdio for MCP integration
});
