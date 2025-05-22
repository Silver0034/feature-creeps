# List of known <span style="color:green">supported</span> LLM API endpoints

## Self-Hosted

- [KoboldCpp](https://github.com/LostRuins/koboldcpp):
  - Defaults to port `5001`.
- [LLaMA.cpp HTTP Server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md):
  - Defaults to port `8080`.
  - Example command: `./llama-server --prio 2 --ctx_size 0 --flash-attn --gpu-layers 9999 -m /Users/kenneth/text-generation-webui/user_data/models/gemma-3-27b-it-Q8_0.gguf --log-colors --host 0.0.0.0 --port 8080`
- [LM Studio](https://lmstudio.ai/):
  - [Provides](https://lmstudio.ai/docs/app/api/endpoints/openai) an OpenAI compatible API.
    - Defaults to port `1234`.
    - Must [load](https://lmstudio.ai/docs/cli/load) a model after start but before use (e.g., `lms load <model_key>`).
  - [Requires](https://lmstudio.ai/docs/cli/server-start) running with `lms server start --cors` to enable CORS support.
  - [Supports](https://lmstudio.ai/docs/app/api/structured-output) `response_format`, but only in the updated form used by the modern OpenAI API.
- [Ollama](https://ollama.com/):
  - [Provides](https://ollama.com/blog/openai-compatibility) an OpenAI compatible API.
    - Defaults to port `11434`.
    - [Requires](https://github.com/ollama/ollama-js/issues/73) setting the `OLLAMA_HOST` environment variable to `0.0.0.0` to access it on a different machine on the network.
  - [Supports](https://ollama.com/blog/structured-outputs) `response_format`.
    - Full list of supported features [here](https://github.com/ollama/ollama/blob/main/docs/openai.md).
  - May want to increase context limit with `/set parameter num_ctx <size>`.
  - Example Usage:
  ```bash
  # NOTE: Make sure Ollama isn't running when you first set this environment variable.
  # Persistently set the listening host to everything on the network.
  launchctl setenv OLLAMA_HOST "0.0.0.0"
  ollama run qwen3:30b-a3b-q8_0
  /set parameter num_ctx 40960
  ```
  - TODO: Must always set a valid `state.options.inference.modelName`. All other tested API implementations are fine ignoring it. For now, that means we don't *actually* support Ollama, but it's an issue on my end, not theirs.

# List of known <span style="color:red">unsupported</span> LLM API endpoints

## Self-Hosted

- [Text generation web UI](https://github.com/oobabooga/text-generation-webui):
  - [Provides](https://github.com/oobabooga/text-generation-webui/wiki/12-%E2%80%90-OpenAI-API) an OpenAI compatible API.
  - [Supports](https://github.com/oobabooga/text-generation-webui/pull/2718) CORS.
  - **Ignores** `response_format`.
  - Must load a model before use.

## Cloud-Hosted

- [Google AI](https://ai.google.dev/):
  - [Provides](https://ai.google.dev/gemini-api/docs/openai) an OpenAI compatible API.
  - **Missing** CORS headers needed to support bring-your-own API keys.
  - [Supports](https://ai.google.dev/gemini-api/docs/structured-output) `response_format`.
- [Anthropic](https://www.anthropic.com/):
  - [Provides](https://docs.anthropic.com/en/api/openai-sdk) an OpenAI compatible API.
  - [Supports](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/) CORS.
  - **[Missing](https://docs.anthropic.com/en/api/openai-sdk)** support for `response_format`.

# List of <span style="color:grey">maybe supported</span> LLM API endpoints

## Self-Hosted

## Cloud-Hosted

- [OpenAI API](https://openai.com/api/):
  - Untested but works according to documents?
  - [Supports](https://platform.openai.com/docs/api-reference/chat/create#chat-create-response_format) `response_format`.
- [Groq](https://groq.com/)
- [xAI](https://x.ai/)
