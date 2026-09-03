import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  // Send a request to Claude Opus 5.
  // Opus 5 supports adaptive thinking, which means Claude decides
  // how much reasoning is needed for the task.
  const response = await client.messages.create({
    model: "claude-opus-5",

    // Maximum number of tokens Claude can generate.
    // This is only a limit, not a guarantee that all tokens will be used.
    max_tokens: 3000,

    // Enable adaptive thinking.
    // "summarized" asks the API to return a summary of the reasoning.
    thinking: {
      type: "adaptive",
      display: "summarized",
    },

    // Control how much effort Claude should spend reasoning.
    // Possible values include: low, medium, high, xhigh, max.
    output_config: {
      effort: "medium",
    },

    messages: [
      {
        role: "user",
        content:
          "I have 8 hours available this weekend. I want to learn Node.js, TypeScript, and PostgreSQL. Create the most effective study plan and explain the trade-offs behind your allocation of time.",
      },
    ],
  });

  // The response may contain different block types,
  // including thinking blocks and normal text blocks.
  for (const block of response.content) {
    if (block.type === "thinking") {
      console.log("\n--- Thinking summary ---");
      console.log(block.thinking);
    }

    if (block.type === "text") {
      console.log("\n--- Final answer ---");
      console.log(block.text);
    }
  }

  // Show token usage so we can see how much this request consumed.
  console.log("\n--- Usage ---");
  console.log(response.usage);
}

main();
