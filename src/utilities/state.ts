// Stores game state.
// Other TS can reference this for its various functions.
// Saves and loads state to localStorage.

import { CharacterSheet } from "@utilities/character-sheet";

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

// Player states:
// TODO: Consider making this an enum with a string mapping.
// -Lost Connection.
// Reconnected!
// -New player connected! Entering a name.
// -Joined!
// -Submitted an invalid name.
// -Entering an ability.
// -Submitted an ability!
// -Ability accepted!
// -Ability rejected. Please try again.

export enum Role {
  Unset,
  Host,
  Client,
  Audience,
  Kicked
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
  soundEffects: boolean;
  vibrate: boolean;
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
  peerId: string,
  status: string,
}

// Defaults are set here.
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
    // Server options.
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
    // Client options.
    soundEffects: true,
    vibrate: true,
  } as OptionsConfig,
  round: 0 as number,
  players: [] as Array<PlayerData>,
  enemies: [] as CharacterSheet[],
}

export function saveGame(): void {
  console.log('Saving game.')
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
    console.log('Game loaded successfully from local storage.', state);

    return true;
  } catch (error: any) {
    console.log('Error parsing loadGame JSON:', { error })
    return false;
  }
}

export function wipeGame(): void {
  localStorage.removeItem('gameSave');
}
