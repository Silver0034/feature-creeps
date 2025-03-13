import type { TTS } from '@utilities/tts';
import { CharacterSheet } from '@utilities/character-sheet.ts'

// These promises let us start generating them in one state and access them from another state.

interface PromisesInterface {
    // Generation of enemies to be added to state.enemies.
    enemies: Promise<CharacterSheet>[],
    // Generation of battle winners and summaries for the current round.
    battles: Promise<[CharacterSheet, string, CharacterSheet, CharacterSheet]>[],
    // Generation of final winner and battle summary for the bonus round.
    battleRoyale: Promise<[CharacterSheet | null, string]> | undefined,
    // Initialization of LLM.
    llm: Promise<void> | undefined,
    // Initialization of TTS.
    tts: Promise<TTS | undefined> | undefined,
}

export let promises: PromisesInterface = {
    // Generation of enemies to be added to state.enemies.
    enemies: [] as Promise<CharacterSheet>[],
    // Generation of battle winners and summaries for the current round.
    battles: [] as Promise<[CharacterSheet, string, CharacterSheet, CharacterSheet]>[],
    // Generation of final winner and battle summary for the bonus round.
    battleRoyale: undefined,
    // Initialization of LLM.
    llm: undefined,
    // Initialization of TTS.
    tts: undefined,
}
