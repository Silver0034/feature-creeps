// NOTE: See if we can get a word-by-word highlight of the text being read in the UI.

import * as vits from "@diffusionstudio/vits-web";
import { KokoroTTS as kokoroTTS } from "kokoro-js";
import { state } from "@utilities/state";

// Base interface for TTS functionality
export interface TTS {
  listModels(): Promise<string[]>; // Get a list of available models
  selectModel(modelName: string): Promise<boolean>; // Select a model
  downloadModel(modelName: string): Promise<boolean>; // Download a model if necessary
  speak(text: string): Promise<void>; // Synthesize and play speech from text
  clearModels(): Promise<void>; // Clear downloaded models
  generate(text: string): Promise<[any, string]>; // Synthesize speech from text
  speakGenerated(wav: any, text: string): Promise<void>; // Play generated speech from text
  // TODO: Add a function to stop playback early.
}

// Implementation for VITS-Web
export class VitsWebTTS implements TTS {
  private audio?: HTMLAudioElement;
  async listModels(): Promise<string[]> {
    const tts_voices = (await vits.voices())
      .filter((voice) => voice.language.code.startsWith("en"))
      .filter((voice) => voice.quality === "high")
      .map((voice) => voice.key);
    return tts_voices;
  }
  async selectModel(modelName: string): Promise<boolean> {
    state.options.tts.voice = modelName;
    console.log(`VITS-Web: Selected model ${modelName}`);
    return true;
  }
  async downloadModel(modelName: string): Promise<boolean> {
    const voice = modelName as vits.VoiceId;
    const stored = await vits.stored();
    if (!stored.includes(voice)) {
      await vits.download(voice, (progress) => {
        console.log(
          `Downloading ${progress.url} - ${Math.round((progress.loaded * 100) / progress.total)}%`
        );
      });
    }
    console.log(`VITS-Web: Downloaded model ${modelName}`);
    return true;
  }
  async generate(text: string): Promise<[Blob, string]> {
    return Promise.all([
      vits.predict({ text: text, voiceId: state.options.tts.voice as vits.VoiceId }),
      Promise.resolve(text)
    ]);
  }
  async speakGenerated(wav: any, text: string): Promise<void> {
    let audio = new Audio();
    audio.src = URL.createObjectURL(wav);
    console.log(`VITS-Web: Speaking: ${text}`);
    audio.play();
    return new Promise((resolve, reject) => {
      if (!audio) {
        return reject("No audio is currently playing.");
      }
      audio.onended = () => {
        resolve();
      };
      audio.onerror = () => {
        reject("Error during audio playback.");
      };
    });
  }
  async speak(text: string): Promise<void> {
    try {
      const wav = await vits.predict({
        text: text,
        voiceId: state.options.tts.voice as vits.VoiceId,
      });
      let audio = new Audio();
      audio.src = URL.createObjectURL(wav);
      console.log(`VITS-Web: Speaking '${text}'`);
      audio.play();
      return new Promise((resolve, reject) => {
        if (!audio) {
          return reject("No audio is currently playing.");
        }
        audio.onended = () => {
          console.log("VITS-Web: Finished speaking.");
          resolve();
        };
        audio.onerror = () => {
          reject("Error during audio playback.");
        };
      });
    } catch (error) {
      console.error("VITS-Web: Error speaking:", error);
    }
  }
  async clearModels(): Promise<void> {
    console.log("VITS-Web: Clearing models.");
    return vits.flush();
  }
}

interface KokoroTTSVoice {
  name: string;
  language: string;
  gender: string;
  traits?: string;
  targetQuality: string;
  overallGrade: string;
}

// Implementation for Kokoro TTS
export class KokoroTTS implements TTS {
  protected tts?: kokoroTTS;
  private internalName = "af_heart";
  private audio?: HTMLAudioElement;
  async initialize(options: Parameters<typeof kokoroTTS.from_pretrained>[1] = { dtype: "fp32", device: "webgpu" }) {
    if (this.tts) { return; }
    this.tts = await kokoroTTS.from_pretrained(
      "onnx-community/Kokoro-82M-v1.0-ONNX",
      options
    );
  }
  async listModels(): Promise<string[]> {
    const voiceList = Object.values(
      this.tts?.voices as Record<string, KokoroTTSVoice>
    );
    const tts_voices = voiceList
      .filter((voice) => voice.language.startsWith("en"))
      .filter(
        (voice) =>
          voice.overallGrade.startsWith("A") ||
          voice.overallGrade.startsWith("B") ||
          voice.name.includes("Lewis")
      )
      .map((voice) => voice.name);
    return tts_voices;
  }
  async selectModel(modelName: string): Promise<boolean> {
    const selectedModel = Object.entries(
      this.tts?.voices as Record<string, KokoroTTSVoice>
    ).find(([_, value]) => value.name === modelName)?.[0];
    console.log(
      `Kokoro: Selected model ${modelName}, internally identified as ${selectedModel}`
    );
    if (selectedModel) {
      state.options.tts.voice = modelName;
      this.internalName = selectedModel;
      return true;
    } else {
      return false;
    }
  }
  async downloadModel(_: string): Promise<boolean> {
    console.log("Kokoro TTS does not require per-voice downloads.");
    return true;
  }
  async generate(text: string): Promise<[any, string]> {
    try {
      if (!this.tts) {
        throw new Error("Kokoro failed to initialize the TTS engine.");
      }
      return Promise.all([
        this.tts.generate(text, {
          // @ts-ignore
          voice: this.internalName,
        }),
        Promise.resolve(text)
      ]);
    } catch (error) {
      throw new Error(`Kokoro failed to generate text: ${text}`);
    }
  }
  async speakGenerated(generated: any, text: string): Promise<void> {
    try {
      let audio = new Audio();
      audio.src = URL.createObjectURL(generated.toBlob());
      console.log(`Kokoro: Speaking: ${text}`);
      audio.play();
      return new Promise((resolve, reject) => {
        if (!audio) {
          return reject("No audio is currently playing.");
        }
        audio.onended = () => {
          resolve();
        };
        audio.onerror = () => {
          reject("Error during audio playback.");
        };
      });
    } catch (error) {
      console.error("Error selecting voice for system model:", error);
    }
  }
  async speak(text: string): Promise<void> {
    try {
      if (!this.tts) {
        throw new Error("Kokoro failed to initialize the TTS engine.");
      }
      const generated = await this.tts.generate(text, {
        // @ts-ignore
        voice: this.internalName,
      });
      let audio = new Audio();
      audio.src = URL.createObjectURL(generated.toBlob());
      console.log(`Kokoro: Speaking '${text}'`);
      audio.play();
      return new Promise((resolve, reject) => {
        if (!audio) {
          return reject("No audio is currently playing.");
        }
        audio.onended = () => {
          console.log("Kokoro: Finished speaking.");
          resolve();
        };
        audio.onerror = () => {
          reject("Error during audio playback.");
        };
      });
    } catch (error) {
      console.error("Error selecting voice for system model:", error);
    }
  }
  async clearModels(): Promise<void> {
    console.log("Kokoro: No need to clear models.");
  }
}

// Implementation for SpeechSynthesis (System) TTS
export class SystemTTS implements TTS {
  private voicesPromise: Promise<void>;
  private currentUtterance?: SpeechSynthesisUtterance;
  private selectedVoice?: SpeechSynthesisVoice;
  constructor() {
    // Browsers normally only finish retrieving the voices onvoiceschanged.
    // Made a promise, to wait for this to happen asynchronously.
    this.voicesPromise = new Promise((resolve) => {
      const voices: SpeechSynthesisVoice[] = speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        // We may resolve a voice list immediately.
        resolve();
      } else {
        speechSynthesis.onvoiceschanged = () => {
          resolve();
        };
      }
    });
  }
  async listModels(): Promise<string[]> {
    // Ensure voices are loaded before retrieving them.
    await this.voicesPromise;
    return speechSynthesis
      .getVoices()
      .filter((voice) => voice.lang.startsWith("en"))
      .map((voice) => voice.name);
  }
  async selectModel(modelName: string): Promise<boolean> {
    try {
      await this.voicesPromise;
      const voice = speechSynthesis
        .getVoices()
        .find((voice) => voice.name === modelName);
      if (!voice) {
        throw new Error(
          "No matching voice found in SpeechSynthesisVoice list."
        );
      }
      this.selectedVoice = voice;
      state.options.tts.voice = modelName;
      console.log(`System TTS: Selected voice ${modelName}`);
      return true;
    } catch (error) {
      console.error("Error selecting voice for system model:", error);
      return false;
    }
  }
  async downloadModel(_: string): Promise<boolean> {
    console.log("System TTS does not require model downloads.");
    return true;
  }
  async generate(text: string): Promise<[any, string]> {
    return Promise.all([
      Promise.resolve(undefined),
      Promise.resolve(text)
    ]);
  }
  async speakGenerated(_: any, text: string): Promise<void> {
    return this.speak(text);
  }
  async speak(text: string): Promise<void> {
    console.log(`System TTS: Speaking '${text}'`);
    const utterThis = new SpeechSynthesisUtterance(text);
    if (!this.selectedVoice) {
      return Promise.reject("No voice selected.");
    }
    utterThis.voice = this.selectedVoice;
    this.currentUtterance = utterThis;
    speechSynthesis.speak(utterThis);
    return new Promise((resolve, reject) => {
      if (!this.currentUtterance) {
        reject("No speech synthesis is currently in progress.");
        return;
      }
      this.currentUtterance.onend = () => {
        console.log("System TTS: Finished speaking.");
        resolve();
      };
      this.currentUtterance.onerror = () => {
        reject("Error during audio playback.");
      };
    });
  }
  async clearModels(): Promise<void> {
    speechSynthesis.cancel();
    console.log(
      "System TTS: Removed all utterances from the utterance queue."
    );
  }
}

// Implementation for No TTS
export class NullTTS implements TTS {
  async listModels(): Promise<string[]> {
    return [];
  }
  async selectModel(_: string): Promise<boolean> {
    return true;
  }
  async downloadModel(_: string): Promise<boolean> {
    console.log("System TTS does not require model downloads.");
    return true;
  }
  async generate(text: string): Promise<[any, string]> {
    return Promise.all([
      Promise.resolve(undefined),
      Promise.resolve(text)
    ]);
  }
  async speakGenerated(_: any, text: string): Promise<void> {
    return this.speak(text);
  }
  async speak(text: string): Promise<void> {
    const wpm = 200;
    const separators = /[ \n\t]/;
    const wordCount = text.split(separators).length;
    const waitTimeMsec = wordCount / wpm * 60 * 1000;
    console.log(`Waiting ${waitTimeMsec}ms based on ${wordCount} words at ${wpm}wpm reading rate: '${text}'`);
    return new Promise(resolve => setTimeout(() => resolve(), waitTimeMsec));
  }
  async clearModels(): Promise<void> {
    return;
  }
}


export let tts: TTS | undefined = undefined;

export async function initTts(options: {
  type?: string;
  voice?: string;
  reload?: boolean;
}): Promise<TTS | undefined> {
  const { type, voice, reload = true } = options;
  // Do not reinitialize if the TTS engine is already started.
  if (!reload &&
    typeof tts !== "undefined" &&
    typeof state.options.tts.type !== "undefined" &&
    typeof state.options.tts.voice !== "undefined") { return; }

  if (type) { state.options.tts.type = type; }
  if (voice) { state.options.tts.voice = voice; }
  switch (state.options.tts.type) {
    case "kokoro":
      // Best quality model. Runs on the GPU via WebGPU.
      // Consumes about 800MB of VRAM.
      tts = new KokoroTTS();
      await (tts as KokoroTTS).initialize();
      break;
    case "kokoroWasm":
      // Best quality model. Runs on multithreaded CPU via WASM.
      tts = new KokoroTTS();
      await (tts as KokoroTTS).initialize({ dtype: "q4", device: "wasm" });
      break;
    case "vitsweb":
      // Medium quality model. Runs on multithreaded CPU via WASM.
      tts = new VitsWebTTS();
      break;
    case "system":
      // Low quality model. Runs using system TTS, which is available on nearly
      // everything and is super cheap to run.
      tts = new SystemTTS();
      break;
    case "none":
      // Silent model. Uses artificial pauses to give people time to read.
      tts = new NullTTS();
      break;
    default:
      console.error("Invalid TTS engine specified");
      return tts;
  }
  if (tts && state.options.tts.voice) {
    await tts.selectModel(state.options.tts.voice).catch((error) => {
      console.error("Error selecting voice:", error);
    });
  }
  return tts;
}

async function generateSentences(
  sentences: string[],
  generatedPromises: Promise<[any, string]>[]
): Promise<[any, string]> {
  if (!tts) {
    return Promise.reject("TTS not initialized.");
  }
  for (let i = 0; i < sentences.length; i++) {
    if (i > 0) {
      await generatedPromises[i - 1];
    }
    generatedPromises.push(tts.generate(sentences[i]));
  }
  return generatedPromises[generatedPromises.length - 1];
}

async function speakSentences(
  sentences: string[],
  generatedPromises: Promise<[Blob, string]>[]
): Promise<void> {
  if (!tts) {
    return Promise.reject("TTS not initialized.");
  }
  let speakPromise: Promise<void> | undefined;
  for (let i = 0; i < sentences.length; i++) {
    if (speakPromise) {
      await speakPromise;
    }
    const [wav, text] = await generatedPromises[i];
    speakPromise = tts.speakGenerated(wav, text);
  }
  return speakPromise;
}

function chunkSpeech(text: string): string[] {
  // TODO: Filter out sentences that consist only of a punctuation mark.
  // Kokoro actually "speaks" them.
  const separators = /([.?!\n])/g;
  return text
    .split(separators)
    .reduce((chunks: string[], part, index, array) => {
      if (index % 2 === 0) {
        // Combine sentence with its separator if available.
        const sentence = part.trim() + (array[index + 1] || "");
        if (sentence.length > 0) chunks.push(sentence);
      }
      return chunks;
    }, []);
}

export async function longSpeak(text: string): Promise<void> {
  if (!tts) {
    return Promise.reject("TTS not initialized");
  }
  const sentences = chunkSpeech(text);
  // List to store generated promises for each sentence.
  const generatedPromises: Promise<[Blob, string]>[] = [];
  // Generate and speak sentences asynchronously.
  // This allows the AI to speak as soon as the first sentence is ready,
  // generate additional sentences in the background, and chunks up the text
  // into small enough bits to be manageable by TTS systems with restrictive
  // character/time limits.
  generateSentences(sentences, generatedPromises);
  const speakPromise = speakSentences(sentences, generatedPromises);
  // Wait for speech to finish.
  return speakPromise;
}