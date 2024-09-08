import { state } from "@utilities/state";
import OpenAI from 'openai';
import { CreateMLCEngine } from "@mlc-ai/web-llm";

let client: any;

try {
  if (state.inference.engine === "local") {
    const initProgressCallback = (initProgress) => {
      console.log(initProgress);
    }
    client = await CreateMLCEngine(
      state.inference.modelName || "Llama-3.1-8B-Instruct-q4f32_1-MLC",
      { initProgressCallback: initProgressCallback },
    );
  } else if (state.inference.engine === "API") {
    client = new OpenAI({
      baseURL: state.inference.apiURL,
      apiKey: state.inference.apiKey || "sk-no-key-required",
      dangerouslyAllowBrowser: true,
    });
  } else {
    throw new Error('No engine type selected. Cannot perform inference.');
  }
} catch (error) {
  console.error("Error initializing client:", error);
  throw error;
}

export function FormatSchema(schema: object): any {
  if (state.inference.engine === "local") {
    return JSON.stringify(schema);
  }
  return schema;
}

export { client }
