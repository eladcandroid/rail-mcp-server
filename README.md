# Jerusalem Light Rail MCP Server

An MCP (Model Context Protocol) server that provides tools for accessing Jerusalem Light Rail schedules. This server is designed to be deployed on Vercel.

## Features

- Get a list of all light rail stations
- Find station IDs by their Hebrew names
- Get train schedules between stations
- Search for trains using Hebrew station names

## Tools Available

### get-stations
Gets all light rail stations and their IDs.

### find-station
Finds a station ID by its Hebrew name.

Parameters:
- `stationName`: The Hebrew name of the station

### get-train-schedule
Gets the train schedule between two stations.

Parameters:
- `fromStationId`: ID of the departure station
- `toStationId`: ID of the arrival station
- `date`: Date in format YYYYMMDD
- `time`: Time in format HHMM

### search-trains-by-name
Searches for trains between two stations using Hebrew station names.

Parameters:
- `fromStationName`: Hebrew name of the departure station
- `toStationName`: Hebrew name of the arrival station
- `date`: (Optional) Date in format YYYYMMDD (default: today)
- `time`: (Optional) Time in format HHMM (default: current time)
- `clientTime`: (Optional) Client's current time in ISO format

## Deployment

### Prerequisites

- Node.js 18 or later
- Vercel account

### Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Run the development server:
   ```
   npm run dev
   ```

### Deploy to Vercel

1. Deploy to Vercel:
   ```
   npm run deploy
   ```

## Using with MCP Clients

This server can be used with any MCP client, including:

- Claude AI (direct integration)
- Custom MCP clients using the MCP TypeScript SDK
- Cursor AI
- Other MCP-compatible clients

### Example: Connecting with a client

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

// Call the search-trains-by-name tool
const result = await client.callTool({
  name: "search-trains-by-name",
  arguments: {
    fromStationName: "נווה יעקב צפון",
    toStationName: "סיירת דוכיפת",
  }
});

console.log(result);
```

## License

MIT
