import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define the tools Claude is allowed to use
const tools: Anthropic.Tool[] = [
  {
    name: "get_weather",
    description: "Get the current weather for a city.",
    input_schema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "The city to get weather for",
        },
      },
      required: ["city"],
    },
  },
];

// Get real weather data from Open-Meteo
async function getWeather(city: string) {
  // Step 1: Convert the city name into latitude and longitude
  const geoResponse = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
  );

  if (!geoResponse.ok) {
    throw new Error("Failed to geocode city");
  }

  const geoData = await geoResponse.json();

  if (!geoData.results?.length) {
    throw new Error(`City not found: ${city}`);
  }

  const location = geoData.results[0];

  const { latitude, longitude, name, country } = location;

  // Step 2: Use the coordinates to get the current weather
  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`,
  );

  if (!weatherResponse.ok) {
    throw new Error("Failed to fetch weather");
  }

  const weatherData = await weatherResponse.json();

  // Return only the data we want Claude to see
  return {
    city: name,
    country,
    temperature: weatherData.current.temperature_2m,
    apparentTemperature: weatherData.current.apparent_temperature,
    windSpeed: weatherData.current.wind_speed_10m,
    weatherCode: weatherData.current.weather_code,
  };
}

// Execute the tool requested by Claude
async function runTool(name: string, input: unknown) {
  if (name === "get_weather") {
    const { city } = input as { city: string };

    return await getWeather(city);
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function main() {
  // Initial conversation message
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: "What should I wear in Zaragoza today?",
    },
  ];

  // Keep running until Claude decides the task is complete
  while (true) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      tools,
      messages,
    });

    console.log("\nStop reason:", response.stop_reason);

    // If Claude has enough information, print the final answer
    if (response.stop_reason === "end_turn") {
      for (const block of response.content) {
        if (block.type === "text") {
          console.log("\nClaude:", block.text);
        }
      }

      break;
    }

    // If Claude wants to use a tool, execute it
    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log("\nClaude requested:");
          console.log(block.name, block.input);

          // Run the tool with the arguments selected by Claude
          const result = await runTool(block.name, block.input);

          console.log("\nTool result:");
          console.log(result);

          // Prepare the tool result to send back to Claude
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      // Add Claude's tool request to the conversation history
      messages.push({
        role: "assistant",
        content: response.content,
      });

      // Add the tool result so Claude can continue reasoning
      messages.push({
        role: "user",
        content: toolResults,
      });
    }
  }
}

main();
