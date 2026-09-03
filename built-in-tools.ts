import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  // -----------------------------
  // 1. Built-in Web Search
  // -----------------------------
  const searchResponse = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 700,

    // This tool runs on Anthropic's infrastructure
    tools: [
      {
        type: "web_search_20260209",
        name: "web_search",
      },
    ],

    messages: [
      {
        role: "user",
        content: "What is the latest stable Node.js release? Answer in one sentence.",
      },
    ],
  });

  console.log("\n=== WEB SEARCH ===");

  for (const block of searchResponse.content) {
    if (block.type === "server_tool_use") {
      console.log("Claude used server tool:");
      console.log(block.name, block.input);
    }

    if (block.type === "text") {
      console.log("\nFinal answer:");
      console.log(block.text);
    }
  }

  console.log("\nSearch usage:");
  console.log(searchResponse.usage);

  // -----------------------------
  // 2. Built-in Code Execution
  // -----------------------------
  const codeResponse = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 1000,

    // Claude can write and execute Python
    // inside Anthropic's sandbox
    tools: [
      {
        type: "code_execution_20260120",
        name: "code_execution",
      },
    ],

    messages: [
      {
        role: "user",
        content: "Calculate the mean, median, and standard deviation of [4, 8, 15, 16, 23, 42]. Use code execution.",
      },
    ],
  });

  console.log("\n=== CODE EXECUTION ===");

  for (const block of codeResponse.content) {
    if (block.type === "server_tool_use") {
      console.log("Claude used server tool:");
      console.log(block.name, block.input);
    }

    if (block.type === "bash_code_execution_tool_result") {
      console.log("\nExecution output:");

      if (block.content.type === "bash_code_execution_result") {
        console.log(block.content.stdout);
      } else {
        console.log("Code execution failed:");
        console.log(block.content);
      }
    }

    if (block.type === "text") {
      console.log("\nFinal answer:");
      console.log(block.text);
    }
  }

  console.log("\nCode execution usage:");
  console.log(codeResponse.usage);
}

main();
