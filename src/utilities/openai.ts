import { state } from "@utilities/state"
import * as webllm from "@mlc-ai/web-llm";
import OpenAI from 'openai';
import { CreateMLCEngine } from "@mlc-ai/web-llm";

let client: any;

if (state.inference.engine === "local") {
  const initProgressCallback = (initProgress) => {
    console.log(initProgress);
  }
  client = await CreateMLCEngine(
    state.inference.modelName || "Llama-3.1-8B-Instruct-q4f32_1-MLC",
    { initProgressCallback: initProgressCallback }, // engineConfig
  );
} else if (state.inference.engine == "API") {
  client = new OpenAI({
    baseURL: state.inference.apiURL,
    apiKey: state.inference.apiKey || "sk-no-key-required",
    dangerouslyAllowBrowser: true,
  });
} else {
  throw new Error('No engine type selected. Cannot perform inference.');
}

export { client }

// TODO: Conversion of CharacterSheets to/from JSON seems broken.
// TODO: Local models are returning garbage.
