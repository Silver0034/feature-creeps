import * as webllm from "@mlc-ai/web-llm";
import { CreateMLCEngine } from "@mlc-ai/web-llm";

export const prerender = false;

// Callback function to update model loading progress
const initProgressCallback = (initProgress) => {
    console.log(initProgress);
}
const selectedModel = "Llama-3.1-8B-Instruct-q4f32_1-MLC";

const engine = await CreateMLCEngine(
    selectedModel,
  { initProgressCallback: initProgressCallback }, // engineConfig
);

var messages = [
    { role: "system", content: "You are a helpful AI assistant." },
    { role: "user", content: "Hello!" },
]

export async function SendMessage(message: string) {
  messages.push({role: "user", content: message})
  const reply = await engine.chat.completions.create({
    messages,
  });
  console.log(reply.choices[0].message);
  console.log(reply.usage);
}

SendMessage("Hello!")