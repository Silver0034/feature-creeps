// Stores game state.
// Other TS can reference this for its various functions.
// Saves and loads state to localStorage.
// TODO: Carefully consider which state to save, which to regenerate, and which to keep private.
// TODO: Carefully consider when to initialize (or re-initialize) code based on changed state.

import { CharacterSheet } from '@utilities/character-sheet.ts';
import { initTts } from '@utilities/tts';
import { initLlm } from '@utilities/openai';

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
  VIP,
  Audience
}

interface State {
  serverId: string | undefined,
  role: Role,
  gameState: GameState;
  round: number;
  options: OptionsConfig;
  // Players are mapped by name.
  players: Array<PlayerData>;
  enemies: CharacterSheet[];
}

interface OptionsConfig {
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
  apiURL: string | undefined;
  apiKey: string;
}

export interface PlayerData {
  sheet: CharacterSheet,
  secret: string,
  // NOTE: Must be updated on client reconnect.
  peerId: string
}

export let state: State = {
  gameState: GameState.Init as GameState,
  serverId: undefined,
  role: Role.Unset as Role,
  options: {
    numRounds: 3 as number,
    inference: {
      engine: undefined,
      modelName: undefined,
      apiURL: undefined,
      apiKey: "sk-no-key-required" as string
    } as InferenceConfig,
    tts: {
      type: "none" as string,
      voice: undefined,
    },
  } as OptionsConfig,
  round: 0 as number,
  players: [] as Array<PlayerData>,
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
    if (state.options.inference.engine) {
      await initLlm();
    }
    if (state.options.tts.type) {
      await initTts({});
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
// state.options.inference.engine = "API";
// state.options.inference.apiURL = "http://192.168.0.12:8080/v1";

state.options.inference.engine = "local";
// Tested and known working model. No gibberish.
// state.options.inference.modelName = "Llama-3.1-8B-Instruct-q4f32_1-MLC";
// Small, modern Llama.
state.options.inference.modelName = "Llama-3.2-3B-Instruct-q4f16_1-MLC";
// Probably the largest supported local model. Needs 31.2GB of VRAM.
// state.options.inference.modelName = "Llama-3.1-70B-Instruct-q3f16_1-MLC";
// This model occasionally spouts garbage symbols. It would likely benefit from a low temperature.
// state.options.inference.modelName = "Phi-3.5-mini-instruct-q4f16_1-MLC";
// For older GPUs.
// state.options.inference.modelName = "Llama-3.2-3B-Instruct-q4f32_1-MLC";