import { selfId } from "trystero/torrent";
import { elements } from "@utilities/elements";
import { initLlm, listModels } from "@utilities/openai";
import { promises } from "@utilities/promises"
import { generateEnemy, genBattleRoyale } from "@utilities/prompts";
import { state, GameState, Role } from "@utilities/state";
import { tts, initTts, longSpeak } from "@utilities/tts";

import { WebRTC } from "@utilities/web-rtc";
import { abilityMixin } from "@utilities/web-rtc/ability";
import { messageMixin } from "@utilities/web-rtc/message";
import { nameMixin } from "@utilities/web-rtc/name";
import { serverMixin } from "@utilities/web-rtc/server";
import { sheetMixin } from "@utilities/web-rtc/sheet";
import { updateMixin } from "@utilities/web-rtc/update";

const WebRTCServer = abilityMixin(messageMixin(nameMixin(serverMixin(sheetMixin(updateMixin(WebRTC))))));
let rtc: InstanceType<typeof WebRTCServer>;

// Constants for valid options.
const VALID_OPTIONS = {
  minRounds: 1,
  inferenceEngine: ["local", "API"],
  ttsType: ["kokoro", "vitsweb", "system", "none"],
};

type OptionPromptResult<T> = T | null;

export function promptWithValidation<T>(
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
  state.role = Role.Host;
  state.hostId = selfId;
  elements.gameState = document.getElementById("gameState") as HTMLInputElement;
  elements.story = document.getElementById("story") as HTMLInputElement;

  // TODO: If we have a game in progress, restore to the appropriate game state. Ensure clients reset to that state as well. The current round must be reset because we never store battle outputs in the state, just the character sheets. We will also need to announce our new peerId to the swarm.
  // If we unwind from all called functions, go back to game start every time.
  await runStateLogic(GameState.Init);
}

// TODO: This is a good function to save state in.
// Figure out where it is safe to do so.
export async function runStateLogic(newState?: GameState) {
  // State change can be specified here, by argument, or set externally before
  // calling this function.
  if (newState) { state.gameState = newState; }

  // Update the displayed game mode.
  if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }

  if (state.role == Role.Host) {
    // Extra logic for RoundAbilities.
    if (state.gameState == GameState.RoundAbilities) {
      // Start next round.
      state.round += 1;
      // Reset the battle promises.
      promises.battles = [];
      // Initialize the player promises.
      promises.playersResolve.clear();
      promises.players = state.players.map(player => {
        return new Promise<void>(resolve => {
          promises.playersResolve.set(player.peerId, resolve);
        });
      });
      // Make sure the next enemy is ready to go.
      const enemy = await promises.enemies[state.round - 1];
      state.enemies.push(enemy);
      // TODO: Save state before starting a round.
    }
    // Notify clients of state change.
    if (rtc) rtc.sendUpdate({ state: state.gameState });
  }

  // Make the state transition.
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
  state.options.playIntro = false;

  document.getElementById("startButton")?.addEventListener("click", async () => {
    // Make sure the inference engines are ready to go.
    promises.tts = initTts({ reload: false });
    promises.llm = initLlm({ reload: false });

    await runStateLogic(GameState.Connect);
  });
  document.getElementById("optionsButton")?.addEventListener("click", async () => {
    await runStateLogic(GameState.Options);
  });
}

async function connect() {
  function generateRoomCode() {
    const characters = state.room.characters;
    const len = state.room.length;
    let code = "";
    for (let i = 0; i < len; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
    return code;
  }

  // Generate a room code.
  // TODO: Make sure it's not already in use.
  state.room.roomId = generateRoomCode();
  const roomCodeElement = document.getElementById("roomCode");
  if (roomCodeElement) roomCodeElement.textContent = state.room.roomId.toUpperCase();
  console.log(state.room.roomId.toUpperCase());
  // Connect to the room.
  rtc = new WebRTCServer(state.room.roomId);

  async function generateEnemies(): Promise<void> {
    await promises.llm;
    // Pre-generate our enemies.
    for (let round = 0; round < state.options.numRounds; round++) {
      promises.enemies.push(generateEnemy(round + 1));
    }
  }
  generateEnemies();

  // Wait for players to connect.
  // New players are created in serverMixin.
  // Names are provided in nameMixin.

  // Wait for start button to be hit.
  document.getElementById("goButton")?.addEventListener("click", async () => {
    // Toss any incomplete character sheets.
    state.players = state.players.filter(player => player.sheet.name !== "Unknown");
    await runStateLogic(GameState.Intro);
  });
}

async function intro() {
  // Send player sheets at the beginning.
  for (const player of state.players) {
    // NOTE: We are sending every sheet to every player.
    // We may prefer to change this in the future.
    rtc.sendSheet({ sheet: player.sheet.toJSON(), peerId: player.peerId });
  }

  await promises.tts;
  if (state.options.playIntro) {
    // Explain game rules.
    const explainString = "Feature Creeps is a roleplaying adventure game where players level up, add new abilities to their character sheets, and face monsters. Every round, a randomly generated Creep will appear. You'll have the chance to read their character sheet before deciding how to improve your character to face them in combat. When you add a new strength, you can write down literally anything you want, so long as it isn't in conflict with your existing abilities. Let your imagination run wild! But don't be too greedy: with every strength you add to your character, an equally harmful weakness gets added too. Keep in mind the final bonus round, where players will fight each other in a climatic battle royale. Can you survive, or will feature creep be your own undoing?";
    await longSpeak(explainString);
  } else {
    const explainString = "Let the games begin!";
    await longSpeak(explainString);
  }
  await runStateLogic(GameState.RoundAbilities);
}

async function roundAbilities() {
  // Display the current creep.
  console.log(state.enemies[state.round - 1].toString());

  // Request new abilities from players.
  await Promise.all(promises.players);

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
  // Play out each battle.
  for (const promise of promises.battles) {
    const [winner, description, c1, c2] = await promise;
    console.log(`${c1.name} vs ${c2.name}`);
    console.log(c1.toString());
    console.log(c2.toString());
    await longSpeak(description);
    winner.wins += 1;
  }

  // Now that the battle has resolved, provide the full sheets to each player.
  for (const player of state.players) {
    // NOTE: We are sending every sheet to every player.
    // We may prefer to change this in the future.
    rtc.sendSheet({ sheet: player.sheet.toJSON(), peerId: player.peerId });
  }

  if (state.round == state.options.numRounds) {
    // Main game ended. Begin bonus round.
    await runStateLogic(GameState.BattleRoyale);
  } else {
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
  console.log(`${winner.name} wins!`);
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
  // Wait before transitioning to the end state.
  await new Promise(resolve => setTimeout(resolve, 10000));
  await runStateLogic(GameState.End);
}

async function end() {
  // Reset game state.
  state.vipId = undefined;
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
  const optionsMenu = document.getElementById('optionsMenu');
  if (optionsMenu) { optionsMenu.style.display = 'block'; }
  // TODO: Make controls functional.

  //   const numRounds = promptWithValidation<number>(
  //     `Enter number of rounds:
  // Valid options: 1 or more
  // Current value: ${state.options.numRounds}`,
  //     (input) => {
  //       const int = parseInt(input);
  //       if (Number.isNaN(int)) return null;
  //       if (int < VALID_OPTIONS.minRounds) return null;
  //       return int;
  //     }
  //   );
  //   if (numRounds) state.options.numRounds = numRounds;
  //   console.log(`state.options.numRounds = ${state.options.numRounds}`);


  //   console.log(VALID_OPTIONS.inferenceEngine);
  //   const inferenceEngine = promptWithValidation<string>(
  //     `Enter a valid inference engine:
  // Valid options: ${JSON.stringify(VALID_OPTIONS.inferenceEngine)}
  // Current value: ${state.options.inference.engine}`,
  //     (input) => {
  //       if (VALID_OPTIONS.inferenceEngine.includes(input)) return input;
  //       return null;
  //     }
  //   );
  //   if (inferenceEngine) state.options.inference.engine = inferenceEngine;
  //   console.log(`state.options.inference.engine = ${state.options.inference.engine}`);


  //   if (state.options.inference.engine == "local") {
  //     const models = await listModels();
  //     const modelStrings = models.map(model => model.model_id);
  //     console.log(modelStrings);
  //     const inferenceModelName = promptWithValidation<string>(
  //       `Enter A valid inference model name:
  // Valid options: ${JSON.stringify(modelStrings)}
  // Current value: ${state.options.inference.modelName}`,
  //       (input) => {
  //         if (modelStrings.includes(input)) return input;
  //         return null;
  //       }
  //     );
  //     if (inferenceModelName) state.options.inference.modelName = inferenceModelName;
  //     console.log(`state.options.inference.modelName = ${state.options.inference.modelName}`);


  //   } else if (state.options.inference.engine == "API") {
  //     const inferenceApiURL = promptWithValidation<string>(
  //       `Enter A valid inference API URL:
  // Current value: ${state.options.inference.apiURL}`,
  //       (input) => { return input; }
  //     );
  //     if (inferenceApiURL) state.options.inference.apiURL = inferenceApiURL;
  //     console.log(`state.options.inference.apiURL = ${state.options.inference.apiURL}`);


  //     const inferenceApiKey = promptWithValidation<string>(
  //       `Enter A valid inference API key:
  // 			Current value: ${state.options.inference.apiKey}`,
  //       (input) => { return input; }
  //     );
  //     if (inferenceApiKey) state.options.inference.apiKey = inferenceApiKey;
  //     console.log(`state.options.inference.apiKey = ${state.options.inference.apiKey}`);
  //   }


  //   console.log(VALID_OPTIONS.ttsType);
  //   const ttsType = promptWithValidation<string>(
  //     `Enter the TTS engine to use:
  // Valid options: ${JSON.stringify(VALID_OPTIONS.ttsType)}
  // Current value: ${state.options.tts.type}`,
  //     (input) => {
  //       if (VALID_OPTIONS.ttsType.includes(input)) {
  //         return input;
  //       }
  //       return null;
  //     }
  //   )
  //   if (ttsType) state.options.tts.type = ttsType;
  //   console.log(`state.options.tts.type = ${state.options.tts.type}`);
  //   await initTts({});


  //   if (state.options.tts.type != "none") {
  //     const ttsVoiceOptions = await tts?.listModels();
  //     console.log(ttsVoiceOptions);
  //     const ttsVoice = promptWithValidation<string>(
  //       `Enter the TTS voice to use:
  // Valid options: ${JSON.stringify(ttsVoiceOptions)}
  // Current value: ${state.options.tts.voice}`,
  //       (input) => {
  //         if (ttsVoiceOptions && ttsVoiceOptions.includes(input)) return input;
  //         return null;
  //       }
  //     )
  //     if (ttsVoice) state.options.tts.voice = ttsVoice;
  //     console.log(`state.options.tts.voice = ${state.options.tts.voice}`);
  //     await initTts({});
  //   }
}
