import { initLlm, listModels } from "@utilities/openai";
import { state, GameState } from "@utilities/state.ts";
import { balanceAbility, generateClass, validateAbility, combat, generateEnemy, genBattleRoyale } from "@utilities/prompts";
import { tts, initTts, longSpeak } from "@utilities/tts";
import type { PlayerData } from "@utilities/state.ts";
import { promises } from "@utilities/promises.ts"

// Constants for valid options.
const VALID_OPTIONS = {
	minRounds: 1,
	inferenceEngine: ["local", "API"],
	ttsType: ["kokoro", "vitsweb", "system", "none"],
};

type OptionPromptResult<T> = T | null;

function promptWithValidation<T>(
	promptMessage: string,
	validator: (input: string) => T | null
): OptionPromptResult<T> {
	const userInput = prompt(promptMessage);
	if (!userInput) {
		return null;
	}
	const validatedValue = validator(userInput);
	if (validatedValue !== null) {
		return validatedValue;
	}
	console.log("Please try again.");
	return promptWithValidation(promptMessage, validator);
}

export async function main(): Promise<void> {
	// TODO: If we have a game in progress, restore to the appropriate game state. Ensure clients reset to that state as well. The current round must be reset because we never store battle outputs in the state, just the character sheets. We will also need to announce our new peerId to the swarm.
	// If we unwind from all called functions, go back to game start every time.
	while (true) {
		await runStateLogic(GameState.Init);
	}
}

async function runStateLogic(newState?: GameState) {
	if (newState) { state.gameState = newState; }
	switch (state.gameState) {
		case GameState.Options: { await options(); break; }
		case GameState.Init: { await init(); break; }
		case GameState.Connect: { await connect(); break; }
		case GameState.Intro: { await intro(); break; }
		case GameState.RoundAbilities: { await roundAbilities(); break; }
		case GameState.RoundBattle: { await roundBattle(); break; }
		case GameState.BattleRoyale: { await battleRoyale(); break; }
		case GameState.Leaderboard: { await leaderboard(); break; }
		case GameState.End: { await end(); break; }
		default: { throw new Error("Invalid GameState"); }
	}
}

async function init() {
	// TEMP: Specify some settings so we don't have to configure each time.
	state.options.tts.type = "kokoro";
	state.options.tts.voice = "Heart";
	// Display game menu.
	// TEMP: Advance automatically.
	await runStateLogic(GameState.Connect);
	// Provide two buttons: "Start", and "Options".
	const button = prompt("'Start' or 'Options'") as string;
	if (button.toLowerCase() == "options") {
		await runStateLogic(GameState.Options);
	} else {
		await runStateLogic(GameState.Connect);
	}
}

async function connect() {
	function validateName(name: string): string | null {
		if (state.players.some(player => player.sheet.name === name)) { return "Name already in use."; }
		if (name.length > 15) { return "Name is too long (>15 characters)."; }
		if (name.length <= 0) { return "Please fill in a name."; }
		return null;
	}

	// Make sure the inference engines are ready to go.
	promises.llm = initLlm(false);
	promises.tts = initTts({ reload: false });

	async function generateEnemies(): Promise<void> {
		await promises.llm;
		// Even now, we can pre-generate our enemies.
		for (let round = 0; round < state.options.numRounds; round++) {
			promises.enemies.push(generateEnemy(round + 1));
		}
	}
	generateEnemies();

	// TODO: Generate an unused room code.

	// TODO: Wait for players to connect.
	// state.players.push({CharacterSheet(name), "", ""});

	// TEMP: Advance automatically.
	await runStateLogic(GameState.Intro);
	// // Wait for start button to be hit.
	// if (promptWithValidation<string>(
	// 	"Type 'Go' to begin.",
	// 	(input) => {
	// 		if (input.toLowerCase() == "go") return input;
	// 		return null;
	// 	}
	// )) {
	// 	await runStateLogic(GameState.Intro);
	// }
}

async function intro() {
	await promises.tts;
	// Explain game rules.
	const explainString = "Feature Creeps is a roleplaying adventure game where players level up, add new abilities to their character sheets, and face monsters. Every round, a randomly generated Creep will appear. You'll have the chance to read their character sheet before deciding how to improve your character to face them in combat. When you add a new strength, you can write down literally anything you want, so long as it isn't in conflict with your existing character sheet. Let your imagination run wild! But don't be too greedy: with every strength you add to your character, an equally harmful weakness gets added too. Keep in mind the final bonus round, where players will fight each other in a climatic battle royale. Can you survive, or will feature creep be your own undoing?";
	// TEMP: Shorter string.
	// const explainString = "Let the games begin!";
	await longSpeak(explainString);

	// Resolve the enemies now.
	await promises.llm;
	const enemies = await Promise.all(promises.enemies);
	for (const enemy of enemies) {
		state.enemies.push(enemy);
	}
	// TODO: Save state to keep these enemies.

	await runStateLogic(GameState.RoundAbilities);
}

async function roundAbilities() {
	async function getPlayerAbility(player: PlayerData) {
		// Only prompt for a strength if it hasn't been entered yet.
		// A strength may already exist if we are resuming from a saved game.
		if (player.sheet.strengths.length < state.round) {
			// TODO: Have a time limit for the player to finish entering their ability.
			// TODO: Wait on the client for a new strength.
			let strength: string = "Dummy strength";

			while (!await validateAbility(player.sheet, strength)) {
				// Keep prompting until the ability is valid.
			}
			// TODO: Allow resubmission if the requested ability is invalid.
			// Add the ability to the character sheet.
			player.sheet.strengths.push(strength);
		}
		// Only prompt for a strength if it hasn't been generated yet.
		// A weakness may already exist if we are resuming from a saved game.
		if (player.sheet.weaknesses.length < state.round) {
			const weakness = await balanceAbility(
				player.sheet,
				player.sheet.strengths[state.round - 1],
				true);
			player.sheet.weaknesses.push(weakness);
		}
		player.sheet.level = state.round;
		player.sheet.className = await generateClass(player.sheet);
		promises.battles.push(combat(player.sheet, state.enemies[state.round - 1]));
	}
	// Increment the round number.
	state.round += 1;
	// TODO: Save state.
	// Reset the battle promises.
	promises.battles = [];
	// Request new abilities from users.
	let userPromises: Promise<void>[] = [];
	for (const player of state.players) {
		userPromises.push(getPlayerAbility(player));
	}
	await Promise.all(userPromises);
	if (state.round == state.options.numRounds) {
		// We can start generating the final battle now.
		promises.battleRoyale = genBattleRoyale(state.players
			.map(player => player.sheet)
			.sort(() => Math.random() - 0.5)
		);
	}
	await runStateLogic(GameState.RoundBattle);
}

async function roundBattle() {
	// Play out the battle.
	const battleResults = await Promise.all(promises.battles);
	for (const [winner, description, c1, c2] of battleResults) {
		console.log(`${c1.name} vs ${c2.name}`);
		console.log(c1.toString());
		console.log(c2.toString());
		longSpeak(description);
		winner.wins += 1;
	}
	// Use the same pattern as TTS long generation.
	if (state.round == state.options.numRounds) {
		// Main game ended. Begin bonus round.
		await runStateLogic(GameState.BattleRoyale);
	} else {
		// On to the next round.
		await runStateLogic(GameState.RoundAbilities);
	}
}

async function battleRoyale() {
	// Play out the final battle.
	const result = await promises.battleRoyale;
	if (!result) { throw Error("Battle royale returned nothing."); }
	const [winner, description] = result;
	await longSpeak(description);
	if (!winner) throw Error("No winner was chosen by the model.");
	winner.wins += 1;
	await runStateLogic(GameState.Leaderboard);
}

async function leaderboard() {
	function printScoreboard(): void {
		const leaderboard = state.players.map((player) => player.sheet).slice().sort((a, b) => b.wins - a.wins);
		console.log("Leaderboard:");
		for (const card of leaderboard) {
			console.log(`${card.name}\t${card.wins} wins`);
		}
	}
	// Display the winners.
	printScoreboard();
	await runStateLogic(GameState.End);
}

async function end() {
	// Reset game state.
	state.round = 0;
	state.players = [];
	state.enemies = [];

	// Go back to init.
	// Rather than using runStateLogic(), we would like to instead let the
	// function calls resolve back to init(). This requires all functions return
	// after calling runStateLogic().
	state.gameState = GameState.Init;
}

// Temporary options menu, since we have no GUI yet.
async function options() {
	const numRounds = promptWithValidation<number>(
		`Enter number of rounds:
Valid options: 1 or more
Current value: ${state.options.numRounds}`,
		(input) => {
			const int = parseInt(input);
			if (Number.isNaN(int)) return null;
			if (int < VALID_OPTIONS.minRounds) return null;
			return int;
		}
	);
	if (numRounds) state.options.numRounds = numRounds;
	console.log(`state.options.numRounds = ${state.options.numRounds}`);


	console.log(VALID_OPTIONS.inferenceEngine);
	const inferenceEngine = promptWithValidation<string>(
		`Enter a valid inference engine:
Valid options: ${JSON.stringify(VALID_OPTIONS.inferenceEngine)}
Current value: ${state.options.inference.engine}`,
		(input) => {
			if (VALID_OPTIONS.inferenceEngine.includes(input)) return input;
			return null;
		}
	);
	if (inferenceEngine) state.options.inference.engine = inferenceEngine;
	console.log(`state.options.inference.engine = ${state.options.inference.engine}`);


	if (state.options.inference.engine == "local") {
		const models = await listModels();
		const modelStrings = models.map(model => model.model_id);
		console.log(modelStrings);
		const inferenceModelName = promptWithValidation<string>(
			`Enter A valid inference model name:
Valid options: ${JSON.stringify(modelStrings)}
Current value: ${state.options.inference.modelName}`,
			(input) => {
				if (modelStrings.includes(input)) return input;
				return null;
			}
		);
		if (inferenceModelName) state.options.inference.modelName = inferenceModelName;
		console.log(`state.options.inference.modelName = ${state.options.inference.modelName}`);


	} else if (state.options.inference.engine == "API") {
		const inferenceApiURL = promptWithValidation<string>(
			`Enter A valid inference API URL:
Current value: ${state.options.inference.apiURL}`,
			(input) => { return input; }
		);
		if (inferenceApiURL) state.options.inference.apiURL = inferenceApiURL;
		console.log(`state.options.inference.apiURL = ${state.options.inference.apiURL}`);


		const inferenceApiKey = promptWithValidation<string>(
			`Enter A valid inference API key:
			Current value: ${state.options.inference.apiKey}`,
			(input) => { return input; }
		);
		if (inferenceApiKey) state.options.inference.apiKey = inferenceApiKey;
		console.log(`state.options.inference.apiKey = ${state.options.inference.apiKey}`);
	}


	console.log(VALID_OPTIONS.ttsType);
	const ttsType = promptWithValidation<string>(
		`Enter the TTS engine to use:
Valid options: ${JSON.stringify(VALID_OPTIONS.ttsType)}
Current value: ${state.options.tts.type}`,
		(input) => {
			if (VALID_OPTIONS.ttsType.includes(input)) {
				return input;
			}
			return null;
		}
	)
	if (ttsType) state.options.tts.type = ttsType;
	console.log(`state.options.tts.type = ${state.options.tts.type}`);
	await initTts({});


	if (state.options.tts.type != "none") {
		const ttsVoiceOptions = await tts?.listModels();
		console.log(ttsVoiceOptions);
		const ttsVoice = promptWithValidation<string>(
			`Enter the TTS voice to use:
Valid options: ${JSON.stringify(ttsVoiceOptions)}
Current value: ${state.options.tts.voice}`,
			(input) => {
				if (ttsVoiceOptions && ttsVoiceOptions.includes(input)) return input;
				return null;
			}
		)
		if (ttsVoice) state.options.tts.voice = ttsVoice;
		console.log(`state.options.tts.voice = ${state.options.tts.voice}`);
		await initTts({});
	}
}
