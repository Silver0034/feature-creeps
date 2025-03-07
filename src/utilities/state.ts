// Stores game state.
// Other TS can reference this for its various functions.
// Saves and loads state to localStorage.
// TODO: Carefully consider which state to save, which to regenerate, and which to keep private.
// TODO: Carefully consider when to initialize (or re-initialize) code based on changed state.

import { CharacterSheet } from '@utilities/character-sheet.ts'

export enum GameState {
	Init = 0,
	Connect,
	Intro,
	RoundAbilities,
	RoundBattle,
	BattleRoyale,
	Leaderboard,
	End
}

interface State {
	gameState: GameState
	round: number
	numRounds: number
	inference: {
		engine: string | null
		modelName: string | null
		apiURL: string | null
		apiKey: string | null
	}
	tts_voice: string
	// Players are mapped by name.
	// TODO: There is more to a player than a CharacterSheet. We must also store connection info (secret, WebRTC connection, etc.)
	players: CharacterSheet[]
	enemies: CharacterSheet[]
}

interface InferenceConfig {
	engine: string | null;
	modelName: string | null;
	apiURL: string | null;
	apiKey: string | null;
}

// TODO: Consider removing these from the state object and just declaring them directly in the file.
export let state: State = {
	gameState: GameState.Init as GameState,
	round: 0 as number,
	numRounds: 3 as number,
	inference: {
		engine: null,
		modelName: null,
		apiURL: null,
		apiKey: "sk-no-key-required" as string | null
	} as InferenceConfig,
	tts_voice: "en_US-ryan-high",
	players: [] as CharacterSheet[],
	enemies: [] as CharacterSheet[]
}

export function saveGame(): void {
	console.log('Saving game.')
	localStorage.setItem('gameSave', JSON.stringify(state))
	console.log('Saved!')
}

export function loadGame(): boolean {
	try {
		const savedData = localStorage.getItem('gameSave')
		if (!savedData) {
			console.log('No existing save found. Starting a new game.')
			return false
		}
		state = JSON.parse(savedData)
		// TODO: If we include connection info in the game state,
		// then we may need clear them and redo the connection process.
		console.log('Game loaded successfully from local storage.')
		return true
	} catch (error: any) {
		console.log('Error parsing loadGame JSON:', { error })
		return false
	}
}

export function wipeGame(): void {
	localStorage.removeItem('gameSave')
}

// DEBUG: Set temporary default values here.
// state.inference.engine = "API"
// state.inference.apiURL = "http://192.168.0.12:8080/v1"
// state.inference.modelName = "llama3.1:70b-instruct-q4_K_S"
// state.inference.modelName = "Phi-3-mini-4k-instruct-fp16"

state.inference.engine = "local"
// Tested and known working model. No gibberish.
state.inference.modelName = "Llama-3.1-8B-Instruct-q4f32_1-MLC"
// Probably the largest supported local model. Needs 31.2GB of VRAM.
// state.inference.modelName = "Llama-3.1-70B-Instruct-q3f16_1-MLC"
// This model occasionally spouts garbage symbols. It would likely benefit from a low temperature.
// state.inference.modelName = "Phi-3.5-mini-instruct-q4f16_1-MLC"