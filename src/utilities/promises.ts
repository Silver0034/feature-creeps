import type { TTS } from "@utilities/tts";
import { CharacterSheet } from "@utilities/character-sheet";

// TODO: More gracefully handle failed promises instead of hanging forever.

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

    // Resolvers for any pending player action.
    players: Promise<void>[],
    playersResolve: Map<string, (value?: void) => void>,
}

export let promises: PromisesInterface = {
    // These promises let us start generating them in one state and access them from another state.
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

    // These promises enable communication with WebRTC mixins.
    // TODO: Use this style: https://chatgpt.com/c/67d295c1-cd34-8010-8d58-42abc1801685
    players: [] as Promise<void>[],
    playersResolve: new Map<string, (value?: void) => void>(),
}
