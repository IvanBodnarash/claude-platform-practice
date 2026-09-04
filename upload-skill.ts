import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";
import fs from "node:fs";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function main() {
  // Upload the actual SKILL.md file as a stream
  const skill = await client.skills.create({
    display_name: "Status Report Generator",
    files: [fs.createReadStream("./status-report/SKILL.md")],
  });

  console.log("Skill created:");
  console.log("ID:", skill.id);
  console.log("Name:", skill.display_name);
}

main();
