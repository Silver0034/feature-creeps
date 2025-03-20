import QRCode from "qrcode-svg";
import { selfId } from "trystero/mqtt";
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
import type { CharacterSheet } from "./character-sheet";

// TEMP: Specify some settings so we don't have to configure each time.
state.options.numRounds = 3;
state.options.tts.type = "kokoro";
state.options.tts.voice = "Lewis";
state.options.inference.engine = "local";
state.options.inference.modelName = "gemma-2-9b-it-q4f16_1-MLC";
// state.options.playIntro = false;

const WebRTCServer = abilityMixin(messageMixin(nameMixin(serverMixin(sheetMixin(updateMixin(WebRTC))))));
let rtc: InstanceType<typeof WebRTCServer>;

// Constants for valid options.
const VALID_OPTIONS = {
  minRounds: 1,
  inferenceEngine: [
    ["local", "WebLLM (WebGPU)"],
    ["API", "OpenAI Compatible API"],
  ] as [string, string][],
  ttsType: [
    ["kokoro", "Kokoro TTS (WebGPU)"],
    ["kokoroWasm", "Kokoro TTS (Wasm)"],
    ["vitsweb", "VITS Web"],
    ["system", "Web Speech API"],
    ["none", "None"]
  ] as [string, string][],
};

export async function main(): Promise<void> {
  state.role = Role.Host;
  state.hostId = selfId;
  elements.gameState = document.getElementById("gameState") as HTMLInputElement;
  elements.story = document.getElementById("story") as HTMLInputElement;
  elements.playerCount = document.getElementById("playerCount") as HTMLElement;

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
  //  (${state.round}/${state.options.numRounds}) will not display the right thing yet, but we do want this.
  if (elements.gameState) { elements.gameState.textContent = `${GameState[state.gameState]}`; }

  // Update the UI.
  // TODO: Use the content views instead.
  for (const key in GameState) {
    if (!isNaN(Number(key))) { continue; }
    const gameState = GameState[key as keyof typeof GameState];
    const div = document.getElementById(GameState[gameState]) as HTMLInputElement;
    if (!div) { continue; }
    div.style.display = gameState === state.gameState ? "block" : "none";
  }

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

  async function makeQr(roomId: string) {
    const roomQr = document.getElementById("roomQr") as HTMLInputElement;
    const qrCode = new QRCode({
      content: `https://${location.host}/client/r=${roomId}`,
      padding: 0,
      ecl: "M",
      join: true,
      container: "svg"
    });
    roomQr.innerHTML = qrCode.svg();
    roomQr.style.display = "block";
  }

  // Generate a room code.
  // TODO: Make sure it's not already in use.
  state.room.roomId = generateRoomCode();
  const roomCodeElement = document.getElementById("roomCode");
  if (roomCodeElement) roomCodeElement.textContent = state.room.roomId.toUpperCase();
  makeQr(state.room.roomId);
  console.log(state.room.roomId.toUpperCase());
  // Connect to the room.
  rtc = new WebRTCServer(state.room.roomId);
  
  async function generateEnemies(): Promise<void> {
    // Pre-generate our enemies.
    for (let round = 0; round < state.options.numRounds; round++) {
      promises.enemies.push((async (): Promise<CharacterSheet> => {
        await promises.llm;
        return generateEnemy(round + 1);
      })());
    }
  }
  await generateEnemies();

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
  let explainString = "";
  if (state.options.playIntro) {
    // Explain game rules.
    explainString = "Feature Creeps is a roleplaying adventure game where players level up, add new abilities to their character sheets, and face monsters. Every round, a randomly generated Creep will appear. You'll have the chance to read their character sheet before deciding how to improve your character to face them in combat. When you add a new strength, you can write down literally anything you want, so long as it isn't in conflict with your existing abilities. Let your imagination run wild! But don't be too greedy: with every strength you add to your character, an equally harmful weakness gets added too. Keep in mind the final bonus round, where players will fight each other in a climatic battle royale. Can you survive, or will feature creep be your own undoing?";
  } else {
    explainString = "Let the games begin!";
  }
  if (elements.story) { elements.story.innerText = explainString; }
  await longSpeak(explainString);

  // Wait for the first creep to be generated before changing state.
  await promises.enemies[0];

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
    if (elements.story) { elements.story.innerText = description; }
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
  if (elements.story) { elements.story.innerText = description; }
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

async function options() {
  function populateDropdown(element: HTMLSelectElement, options: string[], defaultValue: string = "") {
    const optionPairs: [string, string][] = options.map((option) => [option, option]);
    populateDropdownPairs(element, optionPairs, defaultValue);
  }

  function populateDropdownPairs(element: HTMLSelectElement, options: [string, string][], defaultValue: string = "") {
    element.innerHTML = "";
    options.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option[0];
      opt.textContent = option[1];
      element.appendChild(opt);
    });
    element.value = defaultValue;
  }
  async function updateLlmLists() {
    if (!VALID_OPTIONS.inferenceEngine
      .map(([value, _]) => value)
      .includes(inferenceEngine.value)) {
      return;
    }
    state.options.inference.engine = inferenceEngine.value;
    if (state.options.inference.engine === "local") {
      inferenceApiUrl.style.display = "none";
      inferenceApiKey.style.display = "none";

      const models = await listModels();
      // const modelStrings = models.map(model => model.model_id);
      const modelStrings = models.map((model): [string, string] => {
        const vram = model.vram_required_MB;
        const formattedVram = vram ?
          (vram >= 1024 ?
            `\t(${(vram / 1024).toFixed(1)}GB VRAM)` :
            `\t(${Math.floor(vram)}MB VRAM)`) :
          ("");
        return [model.model_id,
        `${model.model_id.replaceAll("-", " ")}${formattedVram}`];
      });
      populateDropdownPairs(inferenceModel, modelStrings, state.options.inference.modelName || "Choose an LLM engine first.");

      inferenceModel.style.display = "block";
    } else if (state.options.inference.engine == "API") {
      inferenceModel.style.display = "none";

      inferenceApiUrl.style.display = "block";
      inferenceApiKey.style.display = "block";
    }
  }
  async function updateTtsLists() {
    if (!VALID_OPTIONS.ttsType
      .map(([value, _]) => value)
      .includes(ttsType.value)) {
      return;
    }
    state.options.tts.type = ttsType.value;
    if (state.options.tts.type === "none") {
      return;
    }
    await initTts({
      type: state.options.tts.type,
      reload: false
    })
    const ttsVoiceOptions = await tts?.listModels();
    ttsVoice.innerHTML = "";
    if (!ttsVoiceOptions) { return; }
    ttsVoiceOptions.forEach(voice => {
      const opt = document.createElement("option");
      opt.value = voice;
      opt.textContent = voice;
      ttsVoice.appendChild(opt);
    });
  }

  const optionsMenu = document.getElementById("options");
  if (optionsMenu) { optionsMenu.style.display = "block"; }

  // Get elements.
  const numRounds = document.getElementById("rounds") as HTMLInputElement;
  const inferenceEngine = document.getElementById("inferenceEngine") as HTMLSelectElement;
  const inferenceModel = document.getElementById("inferenceModel") as HTMLSelectElement;
  const temperature = document.getElementById("temperature") as HTMLInputElement;
  const inferenceApiUrl = document.getElementById("inferenceApiUrl") as HTMLInputElement;
  const inferenceApiKey = document.getElementById("inferenceApiKey") as HTMLInputElement;
  const ttsType = document.getElementById("ttsType") as HTMLSelectElement;
  const ttsVoice = document.getElementById("ttsVoice") as HTMLSelectElement;

  // Load current state.
  if (numRounds) { numRounds.value = state.options.numRounds.toString(); }
  populateDropdownPairs(inferenceEngine, VALID_OPTIONS.inferenceEngine, state.options.inference.engine || "Choose an LLM engine first.");
  await updateLlmLists();
  if (inferenceModel) { inferenceModel.value = state.options.inference.modelName || "Choose an LLM engine first."; }
  if (temperature) { temperature.value = state.options.inference.temperature.toString(); }
  if (inferenceApiUrl) { inferenceApiUrl.value = state.options.inference.apiURL || ""; }
  if (inferenceApiKey) { inferenceApiKey.value = state.options.inference.apiKey || ""; }
  populateDropdownPairs(ttsType, VALID_OPTIONS.ttsType, state.options.tts.type || "Choose a TTS engine first.");
  await updateTtsLists();
  if (ttsVoice) { ttsVoice.value = state.options.tts.voice || "Choose a TTS engine first."; }

  inferenceEngine?.addEventListener("change", async () => {
    const selectedValue = inferenceEngine.value;
    if (VALID_OPTIONS.inferenceEngine
      .map(([value, _]) => value)
      .includes(selectedValue)) {
      state.options.inference.engine = selectedValue;
      await updateLlmLists();
    }
  });

  ttsType?.addEventListener("change", async () => {
    const selectedValue = ttsType.value;
    if (VALID_OPTIONS.ttsType
      .map(([value, _]) => value)
      .includes(selectedValue)) {
      state.options.tts.type = selectedValue;
      await updateTtsLists();
    }
  });

  document.getElementById("saveConfig")?.addEventListener("click", async () => {
    // Save updated state.
    const parsedRounds = parseInt(numRounds.value);
    if (parsedRounds >= VALID_OPTIONS.minRounds) {
      state.options.numRounds = parsedRounds;
      // TODO: On-screen warning.
    }
    state.options.inference.engine = inferenceEngine.value;
    state.options.inference.modelName = inferenceModel.value;
    const parsedTemperature = parseInt(temperature.value);
    if (0 <= parsedTemperature && parsedTemperature >= 2) {
      state.options.inference.temperature = parsedTemperature;
      // TODO: On-screen warning.
    }
    state.options.inference.apiURL = inferenceApiUrl.value;
    state.options.inference.apiKey = inferenceApiKey.value;
    // Reload TTS if these changed.
    let reloadTts = false;
    if (state.options.tts.type !== ttsType.value ||
      state.options.tts.voice !== ttsVoice.value) {
      reloadTts = true;
    }
    state.options.tts.type = ttsType.value;
    state.options.tts.voice = ttsVoice.value;
    if (reloadTts) {
      await initTts({ reload: true });
    }

    console.log(state);

    // Run game state logic after saving.
    await runStateLogic(GameState.Init);
  });
}
