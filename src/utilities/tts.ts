// TODO: See if we can get a word-by-word highlight of the next being read in the UI.
// TODO: Store the chosen TTS solution in state.ts.

import * as vits from "@diffusionstudio/vits-web";
import { KokoroTTS as kokoroTTS } from "kokoro-js";

// Base interface for TTS functionality
export interface TTS {
    listModels(): Promise<string[]>; // Get a list of available models
    selectModel(modelName: string): Promise<boolean>; // Select a model
    downloadModel(modelName: string): Promise<boolean>; // Download a model if necessary
    speak(text: string): Promise<void>; // Synthesize speech from text
    clearModels(): Promise<void>; // Clear downloaded models
}

// Implementation for VITS-Web
export class VitsWebTTS implements TTS {
    // TODO: Save this state in state.ts
    private selectedModel: string | undefined;
    private audio: HTMLAudioElement | undefined;

    async listModels(): Promise<string[]> {
        const tts_voices = (await vits.voices())
            .filter((voice) => voice.language.code.startsWith("en"))
            .filter((voice) => voice.quality === "high")
            .map((voice) => voice.key);
        return tts_voices;
    }
    async selectModel(modelName: string): Promise<boolean> {
        this.selectedModel = modelName;
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
    async speak(text: string): Promise<void> {
        const wav = await vits.predict({
            text: text,
            voiceId: this.selectedModel as vits.VoiceId,
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
    private tts: kokoroTTS | undefined;
    private audio: HTMLAudioElement | undefined;
    // TODO: Save this state in state.ts
    private selectedModel: string | undefined;

    private async initialize() {
        if (this.tts) {
            return;
        }
        // TODO: Automatically identify the best device and type to use based on browser features.
        this.tts = await kokoroTTS.from_pretrained(
            "onnx-community/Kokoro-82M-v1.0-ONNX",
            {
                dtype: "fp32",
                device: "webgpu",
            }
        );
    }
    async listModels(): Promise<string[]> {
        await this.initialize();
        // TODO: Why does list_voices() return void?
        // return this.tts.list_voices();
        // NOTE: This is a hack since there is no other way to list the voices.
        const voiceList = Object.values(
            this.tts?.voices as Record<string, KokoroTTSVoice>
        );
        const tts_voices = voiceList
            .filter((voice) => voice.language.startsWith("en"))
            .filter(
                (voice) =>
                    voice.overallGrade.startsWith("A") ||
                    voice.overallGrade.startsWith("B")
            )
            .map((voice) => voice.name);
        return tts_voices;
    }
    async selectModel(modelName: string): Promise<boolean> {
        const selectedModel = Object.entries(
            this.tts?.voices as Record<string, KokoroTTSVoice>
        ).find(([key, value]) => value.name === modelName)?.[0];
        console.log(
            `Kokoro: Selected model ${modelName}, internally identified as ${selectedModel}`
        );
        this.selectedModel = selectedModel;
        return selectedModel ? true : false;
    }
    async downloadModel(modelName: string): Promise<boolean> {
        await this.initialize();
        console.log("Kokoro TTS does not require per-voice downloads.");
        return true;
    }
    async speak(text: string): Promise<void> {
        await this.initialize();
        try {
            if (!this.tts) {
                throw new Error("Kokoro failed to initialize the TTS engine.");
            }
            const generated = await this.tts.generate(text, {
                // @ts-ignore: Since we know the voice list is already a hack,
                // I will consider this acceptable for now.
                voice: this.selectedModel || "af_heart",
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
        await this.initialize();
        console.log("Kokoro: Cleared models.");
    }
}

// Implementation for SpeechSynthesis (System) TTS
export class SystemTTS implements TTS {
    private voicesLoaded: boolean = false;
    private voicesPromise: Promise<void>;
    private currentUtterance: SpeechSynthesisUtterance | undefined;
    // TODO: Save this state in state.ts
    // TODO: Use a string-based representation in state.ts
    private selectedModel: SpeechSynthesisVoice | undefined;
    constructor() {
        this.voicesPromise = new Promise((resolve) => {
            const voices: SpeechSynthesisVoice[] = speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                this.voicesLoaded = true;
                resolve();
            } else {
                speechSynthesis.onvoiceschanged = () => {
                    this.voicesLoaded = true;
                    resolve();
                };
            }
        });
    }

    async listModels(): Promise<string[]> {
        // Ensure voices are loaded before retrieving them
        await this.voicesPromise;
        return speechSynthesis
            .getVoices()
            .filter((voice) => voice.lang.startsWith("en"))
            .map((voice) => voice.name);
    }

    async selectModel(modelName: string): Promise<boolean> {
        try {
            const voice = speechSynthesis
                .getVoices()
                .find((voice) => voice.name === modelName);
            if (!voice) {
                throw new Error(
                    "No matching voice found in SpeechSynthesisVoice list."
                );
            }
            this.selectedModel = voice;
            console.log(`System TTS: Selected voice ${modelName}`);
            return true;
        } catch (error) {
            console.error("Error selecting voice for system model:", error);
            return false;
        }
    }
    async downloadModel(modelName: string): Promise<boolean> {
        console.log("System TTS does not require model downloads.");
        return true;
    }
    async speak(text: string): Promise<void> {
        console.log(`System TTS: Speaking '${text}'`);
        const utterThis = new SpeechSynthesisUtterance(text);
        if (!this.selectedModel) {
            return;
        }
        utterThis.voice = this.selectedModel;
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
