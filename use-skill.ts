import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  const skillId = process.env.ANTHROPIC_SKILL_ID;

  if (!skillId) {
    throw new Error("ANTHROPIC_SKILL_ID is missing");
  }

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 700,

    // Attach the custom Skill uploaded to your workspace
    container: {
      skills: [
        {
          type: "custom",
          skill_id: skillId,
          version: "latest",
        },
      ],
    },

    // Skills run inside the code execution container
    tools: [
      {
        type: "code_execution_20260521",
        name: "code_execution",
      },
    ],

    messages: [
      {
        role: "user",
        content: `
                    Generate today's status report from this activity log:

                    - Finished POST /users endpoint
                    - Added email validation
                    - Fixed failing auth tests
                    - Database migration is blocked because staging credentials are missing
                    - Tomorrow I want to add pagination
                    - I also want to clean up the controller
        `,
      },
    ],
  });

  for (const block of response.content) {
    if (block.type === "text") {
      console.log(block.text);
    }
  }

  console.log("\nUsage:");
  console.log(response.usage);
}

main();
