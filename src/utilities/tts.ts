import { state } from "@utilities/state";
import * as tts from "@diffusionstudio/vits-web"

// Use this to get a list of voices, then you can store the preferred voice in
// state.tts_voice
export async function GetVoices(): Promise<tts.VoiceId[]> {
    const tts_voices = (await tts.voices())
        .filter(voice => { return voice.language.code === "en_US" })
        .filter(voice => { return voice.quality === "high" })
        .map(voice => { return voice.key });
    return tts_voices;
}

// Make sure the voice specified by state.tts_voice is already downloaded, to
// guarantee the first run is fast.
export async function LoadVoice() {
    const voice = state.tts_voice as tts.VoiceId;
    const stored = await tts.stored();
    if (!stored.includes(voice)) {
        await tts.download(voice, (progress) => {
            console.log(`Downloading ${progress.url} - ${Math.round(progress.loaded * 100 / progress.total)}%`);
        });
    }
}

export async function WipeVoices(): Promise<void> {
    await tts.flush();
}

export async function Speak(text: string) {
    const wav = await tts.predict({
        text: text,
        voiceId: state.tts_voice as tts.VoiceId,
    });
    const audio = new Audio();
    audio.src = URL.createObjectURL(wav);
    audio.play();
}

// Testing. Runs on any page importing this utility.
LoadVoice();
Speak("Just so you know, I find TTS voices SUPER awesome. You should try them out! Got it?");