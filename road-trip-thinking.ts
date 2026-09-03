import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Define the weather tool Claude can use
const tools: Anthropic.Tool[] = [
  {
    name: "get_weather",
    description: "Get the current weather for a city.",
    input_schema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "The city to get current weather for",
        },
      },
      required: ["city"],
    },
  },
];

// Get real weather data from Open-Meteo
async function getWeather(city: string) {
  // Step 1: Convert the city name to coordinates
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

  // Step 2: Get current weather using the coordinates
  const weatherResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`,
  );

  if (!weatherResponse.ok) {
    throw new Error("Failed to fetch weather");
  }

  const weatherData = await weatherResponse.json();

  return {
    city: location.name,
    country: location.country,
    temperature: weatherData.current.temperature_2m,
    apparentTemperature: weatherData.current.apparent_temperature,
    windSpeed: weatherData.current.wind_speed_10m,
    weatherCode: weatherData.current.weather_code,
  };
}

// Execute the tool selected by Claude
async function runTool(name: string, input: unknown) {
  if (name === "get_weather") {
    const { city } = input as { city: string };

    return await getWeather(city);
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function main() {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        "Plan a one-day road trip starting from Salzburg with exactly two interesting stops. Consider approximate driving time and check the current weather for the places you recommend. Explain the trade-offs behind your choice.",
    },
  ];

  while (true) {
    const response = await client.messages.create({
      model: "claude-opus-5",

      // Keep the limit reasonable because thinking also uses output tokens
      max_tokens: 4000,

      // Let Claude decide how much reasoning the task needs
      thinking: {
        type: "adaptive",
        display: "summarized",
      },

      // Medium is enough for this learning example
      // and should consume fewer tokens than high
      output_config: {
        effort: "medium",
      },

      tools,
      messages,
    });

    console.log("\nStop reason:", response.stop_reason);

    // Print thinking summaries when returned
    for (const block of response.content) {
      if (block.type === "thinking") {
        console.log("\n--- Thinking summary ---");
        console.log(block.thinking);
      }
    }

    // Claude has finished the task
    if (response.stop_reason === "end_turn") {
      for (const block of response.content) {
        if (block.type === "text") {
          console.log("\n--- Final answer ---");
          console.log(block.text);
        }
      }

      console.log("\n--- Usage ---");
      console.log(response.usage);

      break;
    }

    // Claude needs one or more tools
    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log("\n--- Tool requested ---");
          console.log(block.name, block.input);

          const result = await runTool(block.name, block.input);

          console.log("\n--- Tool result ---");
          console.log(result);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      // IMPORTANT:
      // Preserve Claude's entire response, including thinking blocks,
      // before sending tool results back.
      messages.push({
        role: "assistant",
        content: response.content,
      });

      messages.push({
        role: "user",
        content: toolResults,
      });
    }
  }
}

main();
