// Stores game state.
// Other TS can reference this for its various functions.
// Saves and loads state to localStorage.
// TODO: Carefully consider which state to save, which to regenerate, and which to keep private.
// TODO: Carefully consider when to initialize (or re-initialize) code based on changed state.

import { CharacterSheet } from '@utilities/character-sheet.ts';
import { initTts } from '@utilities/tts';
import { initLlm } from '@utilities/openai';

export enum GameState {
  Settings = -1,
  Init = 0,
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
  VIP,
  Audience
}

interface State {
  serverId: string | undefined,
  role: Role,
  gameState: GameState;
  round: number;
  // TODO: Consider grouping these as "settings" that don't reset on game end.
  numRounds: number;
  inference: InferenceConfig;
  tts: TTSConfig;
  // Players are mapped by name.
  players: Array<{
    sheet: CharacterSheet,
    secret: string,
    // NOTE: Must be updated on client reconnect.
    peerId: string,
  }>;
  enemies: CharacterSheet[];
}

interface TTSConfig {
  type: string | undefined;
  voice: string | undefined;
}

interface InferenceConfig {
  engine: string | undefined;
  modelName: string | undefined;
  apiURL: string | undefined;
  apiKey: string;
}

export let state: State = {
  serverId: undefined,
  role: Role.Unset as Role,
  gameState: GameState.Init as GameState,
  round: 0 as number,
  numRounds: 3 as number,
  inference: {
    engine: undefined,
    modelName: undefined,
    apiURL: undefined,
    apiKey: "sk-no-key-required" as string
  } as InferenceConfig,
  tts: {
    type: undefined,
    voice: undefined,
  },
  players: [] as Array<{
    sheet: CharacterSheet,
    secret: string,
    peerId: string
  }>,
  enemies: [] as CharacterSheet[],
}

export function saveGame(): void {
  console.log('Saving game.')
  localStorage.setItem('gameSave', JSON.stringify(state))
  console.log('Saved!')
}

export async function loadGame(): Promise<boolean> {
  try {
    const savedData = localStorage.getItem('gameSave');
    if (!savedData) {
      console.log('No existing save found. Starting a new game.');
      return false;
    }
    state = JSON.parse(savedData);
    // TODO: If we include connection info in the game state,
    // then we may need clear them and redo the connection process.
    console.log('Game loaded successfully from local storage.');

    // TODO: Consider relocating this to a set of settings changing functions.
    console.log('Restoring selected models...');
    if (state.inference.engine) {
      await initLlm();
    }
    if (state.tts.type) {
      await initTts();
    }

    return true;
  } catch (error: any) {
    console.log('Error parsing loadGame JSON:', { error })
    return false;
  }
}

export function wipeGame(): void {
  localStorage.removeItem('gameSave');
}

// DEBUG: Set temporary default values here.
// state.inference.engine = "API";
// state.inference.apiURL = "http://192.168.0.12:8080/v1";
// state.inference.modelName = "llama3.1:70b-instruct-q4_K_S";
// state.inference.modelName = "Phi-3-mini-4k-instruct-fp16";

state.inference.engine = "local";
// Tested and known working model. No gibberish.
state.inference.modelName = "Llama-3.1-8B-Instruct-q4f32_1-MLC";
// Probably the largest supported local model. Needs 31.2GB of VRAM.
// state.inference.modelName = "Llama-3.1-70B-Instruct-q3f16_1-MLC";
// This model occasionally spouts garbage symbols. It would likely benefit from a low temperature.
// state.inference.modelName = "Phi-3.5-mini-instruct-q4f16_1-MLC";