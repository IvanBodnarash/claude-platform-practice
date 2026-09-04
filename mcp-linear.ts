import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const linearToken = process.env.LINEAR_MCP_TOKEN;

if (!linearToken) {
  throw new Error("LINEAR_MCP_TOKEN is missing");
}

async function main() {
  const response = await client.beta.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1000,

    // Tell Claude where the remote MCP server is
    mcp_servers: [
      {
        type: "url",
        url: "https://mcp.linear.app/mcp/readonly",
        name: "linear",

        // Authentication for the third-party MCP server
        authorization_token: linearToken,
      },
    ],

    // Give Claude access to the tools exposed by that MCP server
    tools: [
      {
        type: "mcp_toolset",
        mcp_server_name: "linear",
      },
    ],

    messages: [
      {
        role: "user",
        content: "Show me my 5 most recent Linear issues. Do not modify anything.",
      },
    ],

    // MCP connector is currently a beta API feature
    betas: ["mcp-client-2025-11-20"],
  });

  console.dir(response.content, {
    depth: null,
  });

  console.log("\nUsage:");
  console.log(response.usage);
}

main();
