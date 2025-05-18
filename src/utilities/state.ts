// Stores game state.
// Other TS can reference this for its various functions.
// Saves and loads state to localStorage.
// TODO: Carefully consider which state to save, which to regenerate, and which to keep private.
// TODO: Carefully consider when to initialize (or re-initialize) code based on changed state.

import { CharacterSheet } from '@utilities/character-sheet';
import { initTts } from '@utilities/tts';
import { initLlm } from '@utilities/openai';
import { promises } from "@utilities/promises"

export enum GameState {
  Options = 1,
  Init,
  Connect,
  Intro,
  RoundAbilities,
  RoundBattle,
  BattleRoyale,
  Leaderboard,
  End
}

export enum Role {
  Unset,
  Host,
  Client,
  Audience
}

interface State {
  gameState: GameState;
  room: Room,
  hostId: string | undefined,
  vipId: string | undefined,
  role: Role,
  options: OptionsConfig;
  round: number;
  // Players are mapped by name.
  players: Array<PlayerData>;
  enemies: CharacterSheet[];
}

interface Room {
  roomId: string | undefined;
  characters: string;
  length: number;
}

interface OptionsConfig {
  skipIntro: boolean;
  autoFullscreen: boolean;
  numRounds: number;
  inference: InferenceConfig;
  tts: TTSConfig;
}

interface TTSConfig {
  type: string | undefined;
  voice: string | undefined;
}

interface InferenceConfig {
  engine: string | undefined;
  modelName: string | undefined;
  temperature: number;
  apiURL: string | undefined;
  apiKey: string;
}

export interface PlayerData {
  sheet: CharacterSheet,
  secret: string,
  // NOTE: Must be updated on client reconnect.
  peerId: string
}

// Reasonable defaults are set here as needed.
export let state: State = {
  gameState: GameState.Init as GameState,
  room: {
    roomId: undefined,
    characters: "1234567890QWERTYUPASDFGHJKLXCVBNM",
    // characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    length: 6,
  },
  hostId: undefined,
  vipId: undefined,
  role: Role.Unset as Role,
  options: {
    skipIntro: false,
    autoFullscreen: true,
    numRounds: 3 as number,
    inference: {
      engine: "local",
      modelName: "Qwen3-8B-q4f16_1-MLC",
      temperature: 0.7, // 0.7 is OpenAI default.
      apiURL: undefined,
      apiKey: "sk-no-key-required" as string
    } as InferenceConfig,
    tts: {
      type: "kokoro" as string,
      voice: "Heart",
    },
  } as OptionsConfig,
  round: 0 as number,
  players: [] as Array<PlayerData>,
  enemies: [] as CharacterSheet[],
}

export function saveGame(): void {
  console.log('Saving game.')
  // TODO: At some point, support resuming an existing game.
  // In the interim, just use this to save and restore options.
  localStorage.setItem('gameSave', JSON.stringify(state.options))
  console.log('Saved!')
}

export async function loadGame(): Promise<boolean> {
  try {
    const savedData = localStorage.getItem('gameSave');
    if (!savedData) {
      console.log('No existing save found. Starting a new game.');
      return false;
    }
    state.options = JSON.parse(savedData);
    // TODO: If we include connection info in the game state,
    // then we may need clear them and redo the connection process.
    console.log('Game loaded successfully from local storage.');

    // TODO: Disabled, at least for now.
    // It is dangerous if the saved settings are unreasonable for the machine.
    // console.log('Restoring selected models...');
    // if (state.options.tts.type) {
    //   promises.tts = initTts({});
    // }
    // if (state.options.inference.engine) {
    //   promises.llm = initLlm({});
    // }

    return true;
  } catch (error: any) {
    console.log('Error parsing loadGame JSON:', { error })
    return false;
  }
}

export function wipeGame(): void {
  localStorage.removeItem('gameSave');
}
