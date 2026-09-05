import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  // 1. Create a reusable agent configuration
  const agent = await client.beta.agents.create({
    name: "Learning Coding Agent",
    model: "claude-haiku-4-5",
    system: `
You are a simple coding assistant.

When given a task:
- inspect the environment
- use available tools when necessary
- keep the solution simple
- explain what you changed
`,
    tools: [
      {
        type: "agent_toolset_20260401",
      },
    ],
  });

  console.log("Agent:", agent.id);

  // 2. Create the sandbox configuration
  const environment = await client.beta.environments.create({
    name: "learning-agent-environment",
    config: {
      type: "cloud",
      networking: {
        type: "unrestricted",
      },
    },
  });

  console.log("Environment:", environment.id);

  // 3. Create one concrete session/run
  const session = await client.beta.sessions.create({
    agent: agent.id,
    environment_id: environment.id,
    title: "Managed Agent Test",
    initial_events: [
      {
        type: "user.message",
        content: [
          {
            type: "text",
            text: "Create a file called hello.txt containing 'Hello from a managed agent'. Then read the file and tell me what it contains.",
          },
        ],
      },
    ],
  });

  console.log("Session:", session.id);

  // Stream all events produced by the managed agent session
  const stream = await client.beta.sessions.events.stream(session.id);

  console.log("\n=== Managed Agent Activity ===\n");

  for await (const event of stream) {
    switch (event.type) {
      case "agent.message": {
        console.log("🤖 Claude:");

        for (const block of event.content) {
          if (block.type === "text") {
            console.log(block.text);
          }
        }

        console.log();
        break;
      }

      case "session.thread_status_idle": {
        console.log("✓ Agent thread finished");
        break;
      }

      case "session.usage": {
        console.log("\n📊 Usage:");

        console.log(`Input tokens:  ${event.usage.input_tokens}`);
        console.log(`Output tokens: ${event.usage.output_tokens}`);
        console.log(`Cache read:    ${event.usage.cache_read_input_tokens}`);
        console.log(`Active time:   ${event.usage.active_seconds}s`);

        break;
      }

      case "session.status_idle": {
        console.log("\n✅ Session finished");

        if (event.stop_reason?.type) {
          console.log(`Stop reason: ${event.stop_reason.type}`);
        }

        break;
      }

      default: {
        // Temporarily keep this while learning the API.
        // It lets us discover other useful event types.
        console.log(`\n[${event.type}]`);

        break;
      }
    }
  }
}

main();
