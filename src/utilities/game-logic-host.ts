import DOMPurify from "dompurify";
import QRCode from "qrcode-svg";
import { marked } from "marked";
import { selfId } from "trystero/mqtt";

import type { CharacterSheet } from "@utilities/character-sheet";
import { elements, validateElements } from "@utilities/elements";
import { initLlm, listModels } from "@utilities/openai";
import { setPlayerStatus, syncPlayerStatus } from "@utilities/players-list";
import { promises } from "@utilities/promises"
import { state, GameState, Role, saveGame, loadGame } from "@utilities/state";
import { tts, initTts, longSpeak } from "@utilities/tts";
import { generateEnemy, genBattleRoyale } from "@utilities/wrapper";

import { WebRTC } from "@utilities/web-rtc";
import { abilityMixin } from "@utilities/web-rtc/ability";
import { kickMixin } from "@utilities/web-rtc/kick";
import { messageMixin } from "@utilities/web-rtc/message";
import { nameMixin } from "@utilities/web-rtc/name";
import { serverMixin } from "@utilities/web-rtc/server";
import { sheetMixin } from "@utilities/web-rtc/sheet";
import { TimerType, timesyncMixin } from "@utilities/web-rtc/timesync";
import { updateMixin } from "@utilities/web-rtc/update";

const WebRTCServer = abilityMixin(kickMixin(messageMixin(nameMixin(serverMixin(sheetMixin(timesyncMixin(updateMixin(WebRTC))))))));
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

// TODO: Music system. Layered instruments.

export async function main(): Promise<void> {
  // Load settings from localStorage.
  loadGame();

  state.role = Role.Host;
  state.hostId = selfId;

  validateElements();

  // If we unwind from all called functions, go back to game start every time.
  await runStateLogic(GameState.Init);
}

export async function runStateLogic(newState?: GameState) {
  // State change can be specified here, by argument, or set externally before
  // calling this function.
  if (newState) { state.gameState = newState; }

  // Update the displayed game mode.
  //  (${state.round}/${state.options.numRounds}) will not display the right thing yet, but we do want this.
  elements.gameState.textContent = `${GameState[state.gameState]}`;

  // Update the UI.
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
  elements.host.startButton.onclick = async () => {
    // Make sure the inference engines are ready to go.
    if (!promises.tts) {
      promises.tts = initTts({ reload: false });
    }
    if (!promises.llm) {
      promises.llm = initLlm({ reload: false });
    }

    await runStateLogic(GameState.Connect);
  };
  elements.host.optionsButton.onclick = async () => {
    await runStateLogic(GameState.Options);
  };
  elements.host.copyLinkButton.onclick = () => {
    const url = elements.host.joinLink.href;
    if (url) {
      navigator.clipboard.writeText(url)
        .then(() => {
          elements.host.copyLinkButton.textContent = "Copied!";
          setTimeout(() => {
            elements.host.copyLinkButton.textContent = "Copy Link";
          }, 2000);
        })
        .catch(err => {
          console.error("Failed to copy: ", err);
        });
    }
  };
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

  async function makeQr(content: string) {
    const qrCode = new QRCode({
      content: content,
      padding: 0,
      ecl: "M",
      join: true,
      container: "svg"
    });
    elements.host.roomQr.innerHTML = qrCode.svg();
    elements.host.roomQr.style.display = "block";
  }

  // Request full screen on game start.
  if (state.options.autoFullscreen) {
    document.documentElement.requestFullscreen();
  }

  // Keep generating room codes until we find one that is unused.
  do {
    // Generate a room code.
    state.room.roomId = generateRoomCode();
    // Connect to the room.
    rtc = new WebRTCServer(state.room.roomId);
    // TODO: Develop a concise piece of logic to check for people already in the
    // room. For now, assume that the randomizer is sufficiently unlikely to
    // generate a collision.
  } while (false);
  elements.host.roomCode.textContent = state.room.roomId;
  const joinLink = `${location.href}join/?r=${state.room.roomId}`;
  elements.host.joinLink.innerHTML = joinLink;
  elements.host.joinLink.href = joinLink;
  makeQr(joinLink);
  elements.host.joinDiv.style.display = "block";
  console.log(state.room.roomId);

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
  let isStarting = false;
  elements.host.goButton.onclick = async () => {
    isStarting = !isStarting;
    if (isStarting) {
      rtc.broadcastTimer(TimerType.Name, 5, false, elements.host.timer, async () => {
        // Toss any incomplete character sheets.
        state.players = state.players.filter(player => {
          if (player.sheet.name === "Unknown") {
            // Notify the player that they've been kicked, and set their client
            // to discard all messages.
            rtc.sendKick({ reason: "Missing name!" }, player.peerId);
            return false;
          }
          return true;
        });
        elements.host.playerCount.textContent = state.players.length.toString();
        syncPlayerStatus();

        // Needs to be reset in case of repeat rounds.
        elements.host.goButton.innerText = "Start Game";

        await runStateLogic(GameState.Intro);
      });
      elements.host.goButton.innerText = "Cancel Countdown"
    } else {
      rtc.broadcastTimerCancel();
      elements.host.goButton.innerText = "Start Game"
    }
  };
}

async function intro() {
  // Send player sheets at the beginning.
  for (const player of state.players) {
    // NOTE: We are sending every sheet to every player.
    // We may prefer to change this in the future.
    rtc.sendSheet({ sheet: player.sheet.toJSON(), peerId: player.peerId });
  }

  // Set up the TimeSync.
  rtc.updatePeersList();

  await promises.tts;
  let explainString = "";
  if (state.options.skipIntro) {
    explainString = "Let the games begin!";
  } else {
    // Explain game rules.
    explainString = "**Feature Creeps** is a roleplaying adventure game where players level up, add new abilities to their character sheets, and face monsters. Every round, a randomly generated *Creep* will appear. You'll have the chance to read their character sheet before deciding how to improve your character to face them in combat. When you add a new strength, you can write down *literally* anything you want, so long as it isn't in conflict with your existing abilities. Let your imagination run wild! But don't be too greedy: with every **strength** you add to your character, an equally harmful **weakness** gets added too. Keep in mind the final bonus round, where players will fight each other in a climatic battle royale. Can you survive, or will feature creep be your own undoing?";
    // Don't play the intro multiple times in the same session.
    state.options.skipIntro = true;
  }

  const rawHTML = await marked.parse(explainString);
  const sanitized = DOMPurify.sanitize(rawHTML);
  elements.host.story.innerHTML = sanitized;

  await longSpeak(explainString);

  // Wait for the first creep to be generated before changing state.
  await promises.enemies[0];

  elements.host.story.innerHTML = "";

  await runStateLogic(GameState.RoundAbilities);
}

async function roundAbilities() {
  // Display the current creep.
  const enemyString = state.enemies[state.round - 1].toString();
  console.log(enemyString);
  elements.host.enemy.innerText = enemyString;
  elements.host.player.innerText = "";

  // TODO: Add a timer.
  // https://stackoverflow.com/questions/73389954/how-to-sync-html5-audio-across-browsers
  // TODO: Add a “safety quip” fallback is a user doesn’t answer in time.

  for (const player of state.players) {
    setPlayerStatus(player, "Entering an ability.");
  }

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
    elements.host.enemy.innerText = c2.toString();
    elements.host.player.innerText = c1.toString();
    console.log(`${c1.name} vs ${c2.name}`);
    console.log(c1.toString());
    console.log(c2.toString());
    // TODO: Combat sounds system.

    // Some LLMs like to provide the text in markdown. Embrace it and render
    // such text properly.
    const rawHTML = await marked.parse(description);
    const sanitized = DOMPurify.sanitize(rawHTML);
    elements.host.story.innerHTML = sanitized;

    await longSpeak(description);
    winner.wins += 1;
    const winText = `${winner.name} wins!`;
    console.log(winText);
    elements.host.winner.innerText = winText;
    elements.host.winner.style.display = "block";
    await longSpeak(winText);
    // Display the winner for a moment longer.
    await new Promise(resolve => setTimeout(resolve, 5000));
    elements.host.story.innerHTML = "";
    elements.host.winner.style.display = "none";
  }

  // TODO: Let players vote on player-chosen ability (👍 or 👎).
  // This will probably require another mixin.

  // TODO: Show scoreboard on screen.
  // TODO: Use this to provide a small delay between rounds.

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

  // Clear out the prior character sheets.
  elements.host.player.style.display = "none";
  elements.host.enemy.style.display = "none";

  // Some LLMs like to provide the text in markdown. Embrace it and render
  // such text properly.
  const rawHTML = await marked.parse(description);
  const sanitized = DOMPurify.sanitize(rawHTML);
  elements.host.story.innerHTML = sanitized;

  await longSpeak(description);
  if (!winner) throw Error("No winner was chosen by the model.");
  winner.wins += 1;
  const winText = `${winner.name} wins!`;
  console.log(winText);
  await longSpeak(winText);
  // Clear out the story for the next state.
  elements.host.story.innerHTML = "";
  await runStateLogic(GameState.Leaderboard);
}

async function leaderboard() {
  // Show scoreboard on screen.
  function getScoreboardText(): string {
    let scoreboardText: string = "Leaderboard:";
    const leaderboard = state.players.map((player) => player.sheet).slice().sort((a, b) => b.wins - a.wins);
    for (const card of leaderboard) {
      scoreboardText += `\n${card.name}:\t${card.wins} wins`;
    }
    return scoreboardText;
  }
  // Display the winners.
  const scoreboardText = getScoreboardText();
  console.log(scoreboardText);
  elements.host.leaderboardText.innerText = scoreboardText;
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

  // TODO: Add ability to restart with same group.

  // Go back to init.
  // Rather than using runStateLogic(), we would like to instead let the
  // function calls resolve back to init(). This requires all functions return
  // after calling runStateLogic().
  state.gameState = GameState.Init;
}

async function options() {
  let models: any[] = [];

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
      .includes(elements.host.options.inferenceEngine.value)) {
      return;
    }

    state.options.inference.engine = elements.host.options.inferenceEngine.value;

    if (state.options.inference.engine === "local") {
      elements.host.options.inferenceModelRow.style.display = "block";
      elements.host.options.inferenceApiRow.style.display = "none";

      models = await listModels();
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

      populateDropdownPairs(elements.host.options.inferenceModel, modelStrings, state.options.inference.modelName || "Choose an LLM engine first.");

    } else if (state.options.inference.engine === "API") {
      elements.host.options.inferenceApiRow.style.display = "block";

      models = await listModels();
      if (models && models.length > 0) {
        elements.host.options.inferenceModelRow.style.display = "block";
        populateDropdownPairs(elements.host.options.inferenceModel,
          models.map(model => model.id),
          state.options.inference.modelName || "Choose an LLM engine first.");
      } else {
        elements.host.options.inferenceModelRow.style.display = "none";
      }
    }
  }

  async function updateTtsLists() {
    if (!VALID_OPTIONS.ttsType
      .map(([value, _]) => value)
      .includes(elements.host.options.ttsType.value)) {
      return;
    }

    state.options.tts.type = elements.host.options.ttsType.value;

    if (state.options.tts.type === "none") {
      return;
    }

    await initTts({
      type: state.options.tts.type,
      reload: true
    });

    const ttsVoiceOptions = await tts?.listModels();
    elements.host.options.ttsVoice.innerHTML = "";
    if (!ttsVoiceOptions) { return; }

    ttsVoiceOptions.forEach(voice => {
      const opt = document.createElement("option");
      opt.value = voice;
      opt.textContent = voice;
      elements.host.options.ttsVoice.appendChild(opt);
    });
  }

  function updateVramBar() {
    let totalVram = 0;

    // Get LLM VRAM usage.
    if (state.options.inference.engine === "local") {
      const selectedModelId = state.options.inference.modelName;
      const selectedModel = models.find(model => model.model_id === selectedModelId);
      if (selectedModel && selectedModel.vram_required_MB !== undefined) {
        // Convert MB to GB.
        const modelVramGB = selectedModel.vram_required_MB / 1024;
        totalVram += modelVramGB;
        // A fudge factor to account for additional VRAM consumed by context, etc.
        totalVram += 1.6;
      }
    }

    // Get TTS VRAM usage.
    // Only Kokoro consumes VRAM.
    if (state.options.tts.type === "kokoro") {
      const ttsVramGB = 0.8;
      totalVram += ttsVramGB;
    }

    // TODO: Violates rules that all elements are stored in elements.ts.
    const bar = document.getElementById('vramBar');
    const text = document.getElementById('vramText');

    if (bar && text) {
      // A "max VRAM", which we cannot actually know due to WebGPU security.
      const maxVram = 8; // 65% of Steam players have at least this much VRAM.
      const percentage = (totalVram / maxVram) * 100;
      bar.style.width = `${Math.min(percentage, 100)}%`;
      text.textContent = `VRAM Usage: ${totalVram.toFixed(1)} GB`;
    }
  }

  // Load current state.

  elements.host.options.skipIntro.checked = state.options.skipIntro;
  elements.host.options.autoFullscreen.checked = state.options.autoFullscreen;
  elements.host.options.numRounds.value = state.options.numRounds.toString();

  populateDropdownPairs(elements.host.options.inferenceEngine, VALID_OPTIONS.inferenceEngine, state.options.inference.engine || "Choose an LLM engine first.");
  await updateLlmLists();
  elements.host.options.inferenceModel.value = state.options.inference.modelName || "Choose an LLM engine first.";

  elements.host.options.temperature.value = state.options.inference.temperature.toString();
  // TODO: Figure out why this does nothing.
  elements.host.options.tempValue.textContent = state.options.inference.temperature.toString();
  elements.host.options.inferenceApiUrl.value = state.options.inference.apiURL || "";
  elements.host.options.inferenceApiKey.value = state.options.inference.apiKey || "";

  populateDropdownPairs(elements.host.options.ttsType, VALID_OPTIONS.ttsType, state.options.tts.type || "Choose a TTS engine first.");
  await updateTtsLists();
  elements.host.options.ttsVoice.value = state.options.tts.voice || "Choose a TTS engine first.";

  updateVramBar();

  elements.host.options.inferenceEngine.onchange = async () => {
    const selectedValue = elements.host.options.inferenceEngine.value;
    if (VALID_OPTIONS.inferenceEngine
      .map(([value, _]) => value)
      .includes(selectedValue)) {
      state.options.inference.engine = selectedValue;
      updateVramBar();
      await updateLlmLists();
    }
  };

  elements.host.options.inferenceModel.onchange = async () => {
    state.options.inference.modelName = elements.host.options.inferenceModel.value;
    updateVramBar();
  };

  elements.host.options.ttsType.onchange = async () => {
    const selectedValue = elements.host.options.ttsType.value;
    if (VALID_OPTIONS.ttsType
      .map(([value, _]) => value)
      .includes(selectedValue)) {
      state.options.tts.type = selectedValue;
      updateVramBar();
      await updateTtsLists();
    }
  };

  elements.host.options.saveConfig.onclick = async () => {
    // Save updated state.
    state.options.skipIntro = elements.host.options.skipIntro.checked;
    state.options.autoFullscreen = elements.host.options.autoFullscreen.checked;
    const parsedRounds = parseInt(elements.host.options.numRounds.value);
    if (parsedRounds >= VALID_OPTIONS.minRounds) {
      state.options.numRounds = parsedRounds;
    }

    // Reload LLM if these changed.
    let reloadLlm = false;
    if (state.options.inference.engine !== elements.host.options.inferenceEngine.value ||
      state.options.inference.modelName !== elements.host.options.inferenceModel.value ||
      state.options.inference.apiURL !== elements.host.options.inferenceApiUrl.value ||
      state.options.inference.apiKey !== elements.host.options.inferenceApiKey.value) {
      reloadLlm = true;
    }
    state.options.inference.engine = elements.host.options.inferenceEngine.value;
    state.options.inference.modelName = elements.host.options.inferenceModel.value;
    const parsedTemperature = parseFloat(elements.host.options.temperature.value);
    if (0 <= parsedTemperature && parsedTemperature >= 2) {
      state.options.inference.temperature = parsedTemperature;
    }
    state.options.inference.apiURL = elements.host.options.inferenceApiUrl.value;
    state.options.inference.apiKey = elements.host.options.inferenceApiKey.value;
    if (reloadLlm) {
      promises.llm = initLlm({ reload: true });
    }

    // Reload TTS if these changed.
    let reloadTts = false;
    if (state.options.tts.type !== elements.host.options.ttsType.value ||
      state.options.tts.voice !== elements.host.options.ttsVoice.value) {
      reloadTts = true;
    }
    state.options.tts.type = elements.host.options.ttsType.value;
    state.options.tts.voice = elements.host.options.ttsVoice.value;
    if (reloadTts) {
      promises.tts = initTts({ reload: true });
    }

    console.log(state);
    // Save settings to localStorage.
    saveGame();

    // Run game state logic after saving.
    await runStateLogic(GameState.Init);
  };
}
