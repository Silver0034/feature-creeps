import { elements } from "@utilities/elements";
import { state } from "@utilities/state";
import OpenAI from 'openai';
import * as webllm from "@mlc-ai/web-llm";

export let client: any;

async function queryGPUFeatures(): Promise<{ isF16Supported: boolean; maxStorageBufferBindingSize: number; }> {
  // @ts-ignore
  if (!navigator.gpu) {
    console.error("WebGPU not supported.");
    return { isF16Supported: false, maxStorageBufferBindingSize: 0 };
  }
  try {
    // @ts-ignore
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("Couldn't request WebGPU adapter.");
    }
    const device = await adapter.requestDevice({});

    const isF16Supported = adapter.features.has("shader-f16");
    const maxStorageBufferBindingSize = device.limits.maxStorageBufferBindingSize;
    return { isF16Supported, maxStorageBufferBindingSize }

  } catch (error) {
    console.error("Failed to query VRAM limits:", error);
  }
  return { isF16Supported: false, maxStorageBufferBindingSize: 0 };
}

export async function listModels(): Promise<webllm.ModelRecord[]> {
  if (state.options.inference.engine != "local") {
    return [];
  }
  const { isF16Supported, maxStorageBufferBindingSize } = await queryGPUFeatures();
  const suffix = isF16Supported ? "f16" : "f32";
  const vram_limit = maxStorageBufferBindingSize / 1024.0;
  // const androidMaxStorageBufferBindingSize = 1 << 27; // 128MB
  // const mobileVendors = new Set<string>(["qualcomm", "arm"]);
  // const restrictModels = (gpuVendor.length != 0 && mobileVendors.has(gpuVendor)) ||
  //   maxStorageBufferBindingSize <= androidMaxStorageBufferBindingSize;

  let model_list = webllm.prebuiltAppConfig.model_list;

  // Filter out legacy models.
  const cutoffIndex = model_list.findIndex(model => model.model_id === "Llama-3.1-70B-Instruct-q3f16_1-MLC");
  if (cutoffIndex !== -1) {
    model_list = model_list.slice(0, cutoffIndex);
  }

  model_list = model_list
    // Filter out models too large to fit in VRAM
    .filter(model => { return model.vram_required_MB ?? 0 <= vram_limit; })
    // Filter to models supporting low resource requirements
    // .filter(model => { return (model.low_resource_required ?? false)})
    // Filter out models using an unsupported FP representation
    .filter(model => { return model.model_id.includes(suffix); })
    // Sort models by largest (best?) to smallest (fast)
    .sort((a, b) => { return (b.vram_required_MB ?? 0) - (a.vram_required_MB ?? 0); });

  return model_list
}

// TODO: Rework this code to function more like simple-chat: https://github.com/mlc-ai/web-llm/blob/main/examples/simple-chat-ts/src/simple_chat.ts
// We wish to load (and switch) the model after starting the engine.
// We also want to appropriately list only supported models from a drop-down list.
// All model-specified constraints are listed according to the structure listed here: https://github.com/mlc-ai/web-llm/blob/main/src/config.ts
export async function initLlm(options: {
  engine?: string;
  modelName?: string;
  apiURL?: string;
  apiKey?: string;
  reload?: boolean;
}): Promise<void> {
  const { engine, modelName, apiURL, apiKey, reload = true } = options;
  if (engine) { state.options.inference.engine = engine; }
  if (modelName) { state.options.inference.modelName = modelName; }
  if (apiURL) { state.options.inference.apiURL = apiURL; }
  if (apiKey) { state.options.inference.apiKey = apiKey; }
  // Do not reinitialize if the LLM engine is already started.
  if (client && !reload) { return; }

  try {
    switch (state.options.inference.engine) {
      case "local": {
        const initProgressCallback = (report: webllm.InitProgressReport) => {
          console.log(report);
          elements.host.loadStatus.innerText = `LLM Status: ${report.text}`;
        };
        client = await webllm.CreateWebWorkerMLCEngine(
          new Worker(new URL("./llm-worker.ts", import.meta.url), { type: "module" }),
          state.options.inference.modelName || "Llama-3.1-8B-Instruct-q4f32_1-MLC",
          { initProgressCallback: initProgressCallback },
        );
        break;
      }
      case "API": {
        client = new OpenAI({
          baseURL: state.options.inference.apiURL,
          apiKey: state.options.inference.apiKey || "sk-no-key-required",
          // Bring-your-own-key pattern makes this safe.
          dangerouslyAllowBrowser: true,
        });
        break;
      }
      default: {
        throw new Error('No engine type selected. Cannot perform inference.');
      }
    }
  } catch (error) {
    console.error("Error initializing client:", error);
    throw error;
  }
}

export function formatSchema(schema: object): any {
  if (state.options.inference.engine === "local") {
    return JSON.stringify(schema);
  }
  return schema;
}
