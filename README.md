# Jerusalem Light Rail MCP Server

Easily access Jerusalem Light Rail schedules and find the nearest stations to any location using this Model Context Protocol (MCP) server. This server is designed to be deployed on Vercel.

---

## Quick Start

### Requirements

#### Vercel Account
This project is designed to be deployed on Vercel, so you'll need a Vercel account.

#### Node.js
Node.js 18 or later is required to run this project.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/eladcandroid/rail-mcp-server.git
cd rail-mcp-server
```

2. Install dependencies:
```bash
npm install
```

### Usage

To run the server locally:
```bash
npm run dev
```

To deploy to Vercel:
```bash
npm run deploy
```

Once deployed, your MCP endpoint will be available at:
```
https://your-vercel-deployment-url.vercel.app/mcp
```

You can install this server in Claude AI and interact with it right away.

Alternatively, you can test it with any MCP client using the TypeScript SDK:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";

const client = new Client({
  name: "Light Rail Client",
  version: "1.0.0"
});

// Connect to the MCP server
const transport = new StreamableHTTPClientTransport(
  new URL("https://your-vercel-deployment-url.vercel.app/mcp")
);
await client.connect(transport);

// Call a tool
const result = await client.callTool({
  name: "search-trains-by-name",
  arguments: {
    fromStationName: "נווה יעקב צפון",
    toStationName: "סיירת דוכיפת",
  }
});

console.log(result);
```

## Available Tools

* `get-stations` - Get all light rail stations and their IDs

* `find-station` - Find a station ID by its Hebrew name
  * Required arguments:
    * `stationName` (string): The Hebrew name of the station

* `get-train-schedule` - Get the train schedule between two stations
  * Required arguments:
    * `fromStationId` (string): ID of the departure station
    * `toStationId` (string): ID of the arrival station
    * `date` (string): Date in format YYYYMMDD
    * `time` (string): Time in format HHMM

* `search-trains-by-name` - Search for trains between two stations using Hebrew names
  * Required arguments:
    * `fromStationName` (string): Hebrew name of the departure station
    * `toStationName` (string): Hebrew name of the arrival station
  * Optional arguments:
    * `date` (string): Date in format YYYYMMDD (default: today)
    * `time` (string): Time in format HHMM (default: current time)
    * `clientTime` (string): Client's current time in ISO format

* `find-nearest-station-to-landmark` - Find the nearest light rail station to any address or location
  * Required arguments:
    * `landmark` (string): Any location in Jerusalem - street address, landmark, restaurant, etc.
  * Optional arguments:
    * `date` (string): Date in format YYYYMMDD (default: today)
    * `time` (string): Time in format HHMM (default: current time)
    * `clientTime` (string): Client's current time in ISO format

The `find-nearest-station-to-landmark` tool uses OpenStreetMap's Nominatim API to geocode any location in Jerusalem, calculates distances to all stations, and returns the nearest one with walking distance and train schedules. You can query virtually any location:

- Exact addresses (רחוב יפו 97, ירושלים)
- Neighborhoods (נחלאות, רחביה, בקעה)
- Landmarks (הכותל המערבי, מגדל דוד)
- Restaurants and cafes (קפה אמדו, מחניודה)
- Hotels (מלון המלך דוד)
- Shopping centers (קניון ממילא, קניון מלחה)
- Institutions (האוניברסיטה העברית, יד ושם)

## Contributing

We welcome contributions to help improve the Jerusalem Light Rail MCP server. Whether you want to add new tools, enhance existing functionality, or improve documentation, your input is valuable.

For examples of other MCP servers and implementation patterns, see the [Model Context Protocol servers repository](https://github.com/modelcontextprotocol/servers).

## License

This project is licensed under the MIT License.
