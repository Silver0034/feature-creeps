import { selfId } from "trystero/mqtt";
import { CharacterSheet } from "@utilities/character-sheet";
import { elements, validateElements } from "@utilities/elements";
import { state, GameState, Role, saveGame, loadGame } from "@utilities/state";

import { WebRTC } from "@utilities/web-rtc";
import { abilityMixin } from "@utilities/web-rtc/ability";
import { kickMixin } from "@utilities/web-rtc/kick";
import { messageMixin } from "@utilities/web-rtc/message";
import { nameMixin } from "@utilities/web-rtc/name";
import { serverMixin } from "@utilities/web-rtc/server";
import { sheetMixin } from "@utilities/web-rtc/sheet";
import { timesyncMixin } from "@utilities/web-rtc/timesync";
import { updateMixin } from "@utilities/web-rtc/update";

// NOTE: Clients change state to match the server, via getUpdate().

const WebRTCClient = abilityMixin(kickMixin(messageMixin(nameMixin(serverMixin(sheetMixin(timesyncMixin(updateMixin(WebRTC))))))));
let rtc: InstanceType<typeof WebRTCClient>;

let queryStrings: Record<string, string | null>;

function updateStateElement(gameState?: GameState) {
  if (gameState) {
    state.gameState = gameState;
  }
  if (state.gameState != GameState.Intro) {
    elements.client.introDiv.style.display = "none";
  }
  elements.gameState.textContent = GameState[state.gameState];
}

export async function main(): Promise<void> {
  // Load settings from localStorage.
  loadGame();

  state.role = Role.Client;
  validateElements();
  await init();
}

export async function init() {
  updateStateElement(GameState.Init);
  queryStrings = new Proxy(Object.create(null), {
    get: (_, prop: string) => new URLSearchParams(window.location.search).get(prop) ?? null,
  }) as Record<string, string | null>;


  // Set up options menu triggers.
  elements.client.optionsButton.onclick = () => {
    if (elements.client.optionsDiv.style.display === "block") {
      // Save updated state.
      state.options.soundEffects = elements.client.options.soundEffects.checked;
      state.options.vibrate = elements.client.options.vibrate.checked;
      elements.client.optionsDiv.style.display = "none";
      // Save settings to localStorage.
      saveGame();
    } else {
      // Load state to the UI.
      elements.client.options.soundEffects.checked = state.options.soundEffects;
      elements.client.options.vibrate.checked = state.options.vibrate;
      elements.client.optionsDiv.style.display = "block";
    }
  };
  elements.client.options.testSoundEffects.onclick = () => {
    playSound(true);
  };
  elements.client.options.testVibrate.onclick = () => {
    vibrate(true);
  };
  elements.client.options.saveConfig.onclick = () => {
    // Save updated state.
    state.options.soundEffects = elements.client.options.soundEffects.checked;
    state.options.vibrate = elements.client.options.vibrate.checked;
    elements.client.optionsDiv.style.display = "none";
    // Save settings to localStorage.
    saveGame();
  };


  await connect();
}

export async function connect() {
  updateStateElement(GameState.Connect);
  let room = queryStrings.r;

  if (!room) {
    // Provide a room code.
    elements.client.roomDiv.style.display = "block";
    await new Promise<void>((resolve) => {
      elements.client.submitRoomId.onclick = () => {
        room = elements.client.roomId.value.trim();
        resolve();
      };
      elements.client.roomId.onkeydown = (event) => {
        if (event.key === "Enter") {
          room = elements.client.roomId.value.trim();
          resolve();
        }
      };
    });
  }

  // Validate the room code.
  const validPattern = new RegExp(`^[${state.room.characters}]{${state.room.length}}$`);
  if (room && validPattern.test(room)) {
    state.room.roomId = room;
    rtc = new WebRTCClient(state.room.roomId);
  } else {
    throw Error(`Invalid room code: ${room}`);
  }

  // Provide a name.
  function nameSender() {
    const input = elements.client.nameInput.value.trim();
    if (!input) {
      return;
    }
    const validationResponse = rtc.validateName(input);
    elements.client.nameInput.value = "";
    if (!validationResponse) {
      rtc.sendName({ name: input }, state.hostId);
      elements.client.feedback.innerText = "";
      elements.client.nameDiv.style.display = "none";
    } else {
      console.warn(`Invalid name: ${validationResponse}`);
      rtc.HandleInvalidName(validationResponse);
    }
  }
  elements.client.submitName.onclick = () => {
    nameSender();
  };
  elements.client.nameInput.onkeydown = (event) => {
    if (event.key === "Enter") {
      nameSender();
    }
  };

  // TODO: Provide a selection of character portraits and sounds.

  if (state.vipId == selfId) {
    elements.client.startGame.onclick = async () => {
      // TODO: Set up a mixin to instruct the server to start the game from here.
    };
  }
}

export async function intro() {
  updateStateElement();

  // Set up the TimeSync.
  rtc.updatePeersList();

  if (state.vipId == selfId) {
    elements.client.skipInto.onclick = async () => {
      // TODO: Skip intro.
      // TODO: Make a skip mixin.
      // TODO: Will require a way to kill TTS playback early.
    };
    elements.client.introDiv.style = "block";
  }
}

export async function roundAbilities() {
  updateStateElement();
  // Show current player sheet.
  console.log(state.players.find((player) => player.peerId == selfId)?.sheet.toString());

  // Notify the player that it is time to enter an ability.
  notify();

  function abilitySender(useFallback: boolean = false) {
    if (useFallback) {
      rtc.sendAbility({ ability: "", useFallback: true }, state.hostId);
    } else {
      const ability = elements.client.abilityInput.value.trim();

      // Ignore empty ability submissions.
      if (!ability || ability === "") { return; }

      rtc.sendAbility({ ability: ability, useFallback: false }, state.hostId);
    }

    elements.client.feedback.innerText = "";
    elements.client.abilityInput.value = "";
    elements.client.abilityDiv.style.display = "none";
  }

  // LEVEL UP!
  // Please enter a new ability for your character:
  elements.client.abilityDiv.style.display = "block";
  elements.client.submitAbility.onclick = () => {
    abilitySender(false);
  };
  elements.client.submitAbilityFallback.onclick = () => {
    abilitySender(true);
  };
  elements.client.abilityInput.onkeydown = (event) => {
    if (event.key === "Enter") {
      abilitySender(false);
    }
  };

  // NOTE: May getAbilityFB() if this ability doesn't pass LLM validation.
  // May have to send one in multiple times.
}

export async function roundBattle() {
  updateStateElement();
}

export async function battleRoyale() {
  updateStateElement();
}

export async function leaderboard() {
  updateStateElement();
}

export async function end() {
  updateStateElement();
  // Reset game state.
  state.hostId = undefined;
  state.vipId = undefined;
  state.round = 0;
  state.players = [];
  state.enemies = [];
  saveGame();

  // NOTE: Sit here forever, as the room code will no longer be valid for reuse.
}

export async function options() {
  updateStateElement();
}

function playSound(override: boolean = false) {
  if (!state.options.soundEffects && !override) {
    return;
  }
  const base = import.meta.env.BASE_URL ?? '/';
  const audio = new Audio(base.endsWith('/') ?
    base + 'sounds/bottleTap.flac' :
    base + '/sounds/bottleTap.flac');

  audio.play().catch(error => {
    console.error("Failed to play notification tone:", error);
  });
}

function vibrate(override: boolean = false) {
  if (!state.options.vibrate && !override) {
    return;
  }
  navigator.vibrate(200);
}

export async function notify() {
  vibrate();
  playSound();
}

export async function updateSheet(sheet: CharacterSheet) {
  elements.client.sheet.innerText = sheet.toString();
  elements.client.sheet.style.display = "block";
}