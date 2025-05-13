# Jerusalem Light Rail MCP Server

A Claude-compatible MCP server for fetching Jerusalem light rail schedules. This server provides tools to get information about the Jerusalem light rail system in Hebrew.

## Features

- Get all light rail stations and their IDs
- Find station IDs by Hebrew station names
- Get real-time train schedules between stations
- Search for trains using natural Hebrew language

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/jerusalem-light-rail-mcp.git
cd jerusalem-light-rail-mcp

# Install dependencies
npm install
```

## Usage

### Run as MCP Server

Start the server normally:

```bash
npm start
```

### Development Mode

Run the server in development mode with the built-in MCP CLI:

```bash
npm run dev
```

### Debug with MCP Inspector

Use the MCP Inspector for visual debugging:

```bash
npm run inspect
```

## Integration with Claude

To use this server with Claude, create a configuration file like this:

```json
{
  "mcpServers": {
    "jerusalem-light-rail": {
      "command": "npx",
      "args": ["tsx", "/path/to/jerusalem-light-rail-mcp/src/index.ts"],
      "env": {}
    }
  }
}
```

Save this as `claude-config.json` and enable Claude to access it when running queries about Jerusalem's light rail.

## Example Queries

### Natural Language Query (Hebrew)

```
הצג לי את זמן הרכבות הקרובות מנווה יעקב צפון לסיירת דוכיפת
```

This will automatically:
1. Detect the station names
2. Find their IDs
3. Use the current time
4. Display upcoming train schedules with departure times, arrival times, and crowdedness levels

### Using Individual Tools

```
# Get all stations
get-stations

# Find a station ID
find-station { "stationName": "נווה יעקב – צפון" }

# Get train schedule
get-train-schedule {
  "fromStationId": 1,
  "toStationId": 6,
  "date": "20250511",
  "time": "1136"
}

# Search by station names
search-trains-by-name {
  "fromStationName": "נווה יעקב צפון",
  "toStationName": "סיירת דוכיפת"
}
```

## Data Source

This server fetches real-time data from the official Jerusalem Light Rail API.

## License

MIT
