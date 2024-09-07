// Stores game state.
// Other TS can reference this for its various functions.
// Saves and loads state to localStorage.

import { CharacterSheet } from '@utilities/character-sheet.ts'

export enum GameState {
	Init = 0,
	Connect,
	Intro,
	Round,
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
	players: CharacterSheet[]
	enemies: CharacterSheet[]
}

export let state: State = {
	gameState: GameState.Init as GameState,
	round: 0 as number,
	numRounds: 3 as number,
	inference: {
		engine: null,
		modelName: null,
		apiURL: null,
		apiKey: 'sk-no-key-required' as string | null
	} as object,
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
		console.log('Game loaded successfully from local storage.')
		return true
	} catch (error: any) {
		console.log('Error parsing loadGame JSON:', { error })
		return false
	}
}
