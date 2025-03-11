// TODO: Make this all functional. Do it last, after the other parts work.

import { CharacterSheet } from "@utilities/character-sheet.ts";
import {
	GameState,
	state,
	saveGame,
	loadGame,
	wipeGame,
} from "@utilities/state.ts";
import * as prompts from "@utilities/prompts.ts";

async function addAbility(
	character: CharacterSheet,
	ability: string,
	isStrength: boolean
): Promise<boolean> {
	let new_strength = "";
	let new_weakness = "";
	if (isStrength) {
		new_strength = ability;
		new_weakness = await prompts.balanceAbility(character, new_strength, true);
	} else {
		new_weakness = ability;
		new_strength = await prompts.balanceAbility(character, new_weakness, false);
	}
	character.strengths.push(new_strength);
	character.weaknesses.push(new_weakness);
	character.level += 1;
	character.className = await prompts.generateClass(character);
	return true;
}

function validateName(name: string): string | null {
	for (const player of state.players) {
		if (name === player.name) {
			return "Name already in use.";
		}
	}
	if (name.length > 15) {
		return "Name is too long (>15 characters).";
	}
	if (name.length <= 0) {
		return "Please fill in a name.";
	}
	return null;
}

function initializeGame(): void {
	// TODO: Rework into a player join system.
	while (true) {
		const name = prompt(
			'Please enter a name for your character, or "done" when you have no more players to add: '
		) as string;
		if (name === "done") {
			break;
		}
		const validationError = validateName(name);
		if (validationError != null) {
			console.log(validationError);
		}
		state.players.push(new CharacterSheet(name));
	}
}

function printScoreboard(): void {
	const leaderboard = state.players.slice().sort((a, b) => b.wins - a.wins);
	console.log("Leaderboard:");
	for (const card of leaderboard) {
		console.log(`${card.name}\t${card.wins} wins`);
	}
}

function printPlayers(): void {
	for (const player of state.players) {
		console.log(player);
	}
}

async function runRound(round: number): Promise<void> {
	// TODO: Completely refactor this to instead prompt clients to enter abilities.
	console.log(`Begin round ${round + 1}`);
	// TODO: Pre-generate and cache these?
	const enemy = await prompts.generateEnemy(round + 1);
	console.log(enemy);
	for (const player of state.players) {
		while (true) {
			console.log("Existing character sheet:");
			console.log(player);
			const ability = prompt(
				`Level up! Enter a new ability for ${player.name}: `
			) as string;
			const validationError = prompts.validateAbility(player, ability);
			if (validationError === null) {
				// TODO: Support strengths and weaknesses.
				await addAbility(player, ability, true);
				break;
			} else {
				console.log(validationError);
			}
		}
	}
	console.log("Your updated character sheets:");
	printPlayers();
	// The face-off.
	for (const player of state.players) {
		console.log(`${player.name} is about to face ${enemy.name}!`);
		const [winner, combat_description] = await prompts.combat(player, enemy);
		console.log(combat_description);
		console.log(`${winner.name} wins this round!`);
		winner.wins += 1;
	}
}

async function runPvpPairs(): Promise<void> {
	console.log("Bonus round! Begin PvP!");
	const pairs = [] as [CharacterSheet, CharacterSheet][];
	for (let i = 0; i < state.players.length; i++) {
		for (let j = i + 1; j < state.players.length; j++) {
			pairs.push([state.players[i], state.players[j]]);
		}
	}
	// Randomize the order of the combat, to avoid bias.
	for (let i = 0; i < pairs.length; i++) {
		pairs[i].sort(() => Math.random() - 0.5);
	}
	pairs.sort(() => Math.random() - 0.5);

	for (const [p1, p2] of pairs) {
		console.log(`${p1.name} is about to face ${p2.name}!`);
		const [winner, combat_description] = await prompts.combat(p1, p2);
		console.log(combat_description);
		console.log(`${winner.name} wins this round!`);
	}
}

async function runPvpBr(): Promise<void> {
	console.log("Bonus round! Begin PvP!");
	state.players.sort(() => Math.random() - 0.5);
	const [winner, combat_description] = await prompts.battleRoyale(
		state.players
	);
	console.log(combat_description);
	if (winner) {
		console.log(`${winner.name} wins the final conflict!`);
	}
}

function main(): void {
	// TODO: Rework to better accommodate saved state in state.gameState.
	initializeGame();
	for (; state.round < state.numRounds; state.round++) {
		runRound(state.round);
		saveGame();
	}
	if (state.players.length > 1) {
		state.gameState = GameState.BattleRoyale;
		runPvpBr();
	}
	state.gameState = GameState.Leaderboard;
	printScoreboard();
	state.gameState = GameState.End;
	console.log("Final character sheets:");
	printPlayers();
	// Wipe the game to avoid getting stuck in the end state.
	wipeGame();
}

main();
