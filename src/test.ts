/**
 * Simple test script to ensure the Jerusalem light rail API endpoints are working correctly
 */

async function testStationAPI() {
  console.log("Testing GetSearchStations API...");
  
  try {
    const response = await fetch('https://www.cfir.co.il/__svws__/SVService.asmx/GetSearchStations', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Origin': 'https://www.cfir.co.il',
        'Referer': 'https://www.cfir.co.il/'
      },
      body: '{}'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stations: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Stations API response:", data.d.slice(0, 3)); // Show first 3 stations
    console.log(`Total stations found: ${data.d.length}`);
    
    return data.d;
  } catch (error) {
    console.error("Error testing station API:", error);
    return null;
  }
}

async function testScheduleAPI() {
  console.log("\nTesting SearchTrains API...");
  
  try {
    // Using נווה יעקב צפון (ID 1) to סיירת דוכיפת (ID 6)
    const fromStationId = 1;
    const toStationId = 6;
    const date = new Date();
    const formattedDate = date.getFullYear() + 
                         String(date.getMonth() + 1).padStart(2, '0') + 
                         String(date.getDate()).padStart(2, '0');
    const formattedTime = String(date.getHours()).padStart(2, '0') + 
                         String(date.getMinutes()).padStart(2, '0');
    
    const response = await fetch('https://www.cfir.co.il/__svws__/SVService.asmx/SearchTrains', {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Origin': 'https://www.cfir.co.il',
        'Referer': `https://www.cfir.co.il/train-search-result/?FSID=${fromStationId}&TSID=${toStationId}&Date=${formattedDate}&Hour=${formattedTime}&IDT=true&ILT=false`
      },
      body: JSON.stringify({
        fsid: String(fromStationId),
        tsid: String(toStationId),
        date: formattedDate,
        hour: formattedTime,
        idt: "true",
        ilt: "false"
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch schedule: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Schedule API response:");
    console.log(`From: ${data.d.FromStationName}, To: ${data.d.ToStationName}`);
    console.log(`Travel time: ${data.d.TravelTime} minutes`);
    console.log(`First 3 train times:`, data.d.TrainTimes.slice(0, 3));
    
    return data.d;
  } catch (error) {
    console.error("Error testing schedule API:", error);
    return null;
  }
}

async function runTests() {
  await testStationAPI();
  await testScheduleAPI();
  console.log("\nTests completed!");
}

runTests();
