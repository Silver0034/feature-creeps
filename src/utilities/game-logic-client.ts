import { selfId } from "trystero/mqtt";
import { elements } from "@utilities/elements";
import { state, GameState, Role } from "@utilities/state";

import { WebRTC } from "@utilities/web-rtc";
import { abilityMixin } from "@utilities/web-rtc/ability";
import { messageMixin } from "@utilities/web-rtc/message";
import { nameMixin } from "@utilities/web-rtc/name";
import { serverMixin } from "@utilities/web-rtc/server";
import { sheetMixin } from "@utilities/web-rtc/sheet";
import { updateMixin } from "@utilities/web-rtc/update";

// NOTE: Clients change state to match the server, via getUpdate().

const roomDiv = document.getElementById("roomDiv") as HTMLInputElement;
const nameDiv = document.getElementById("nameDiv") as HTMLInputElement;
const abilityDiv = document.getElementById("abilityDiv") as HTMLInputElement;

const WebRTCClient = abilityMixin(messageMixin(nameMixin(serverMixin(sheetMixin(updateMixin(WebRTC))))));
let rtc: InstanceType<typeof WebRTCClient>;

let queryStrings: Record<string, string | null>;

export async function main(): Promise<void> {
  state.role = Role.Client;
  elements.gameState = document.getElementById("gameState") as HTMLInputElement;
  await init();
}

export async function init() {
  if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }
  queryStrings = new Proxy(Object.create(null), {
    get: (_, prop: string) => new URLSearchParams(window.location.search).get(prop) ?? null,
  }) as Record<string, string | null>;
  await connect();
}

export async function connect() {
  if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }
  let roomId = queryStrings.r;
  const roomInput = document.getElementById("roomId") as HTMLInputElement;
  const submitRoomId = document.getElementById("submitRoomId") as HTMLButtonElement;
  const nameInput = document.getElementById("nameInput") as HTMLInputElement;
  const submitName = document.getElementById("submitName") as HTMLButtonElement;

  if (!roomId) {
    // Provide a room code.
    roomDiv.style.display = "inline";
    await new Promise<void>((resolve) => {
      submitRoomId.addEventListener("click", () => {
        roomId = roomInput.value.trim();
        resolve();
      });
    });
  }

  // Validate the room code.
  const validPattern = new RegExp(`^[${state.room.characters}]{${state.room.length}}$`);
  if (roomId && validPattern.test(roomId)) {
    state.room.roomId = roomId;
    rtc = new WebRTCClient(state.room.roomId);
  } else {
    throw Error(`Invalid room code: ${roomId}`);
  }

  // Provide a name.
  nameDiv.style.display = "inline";
  submitName.addEventListener("click", () => {
    const input = nameInput.value.trim();
    if (input) {
      const validationResponse = rtc.validateName(input);
      if (!validationResponse) {
        rtc.sendName({ name: input });
      } else {
        console.warn(`Invalid name: ${validationResponse}`);
      }
    }
  });

  // TODO: Press the start button.
  // TODO: Make a skip mixin.
  if (state.vipId == selfId) {

  }
}

export async function intro() {
  if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }
  // TODO: Skip intro.
  // TODO: Will require a way to kill TTS playback early.
  if (state.vipId == selfId) {

  }
}

export async function roundAbilities() {
  if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }
  // Show current player sheet.
  console.log(state.players.find((player) => player.peerId == selfId)?.sheet.toString());

  const abilityInput = document.getElementById("abilityInput") as HTMLInputElement;
  const submitAbility = document.getElementById("submitAbility") as HTMLButtonElement;

  // LEVEL UP!
  // Please enter a new ability for your character:
  abilityDiv.style.display = "inline";
  submitAbility.addEventListener("click", () => {
    const ability = abilityInput.value.trim();
    if (!ability) { throw Error("Invalid ability provided."); }
    rtc.sendAbility({ ability: ability });
  });

  // NOTE: May getAbilityFB() if this ability doesn't pass LLM validation.
  // May have to send one in multiple times.

  // TODO: Consider an LLM-generated fallback if the player can't figure out an
  // ability in time.
}

export async function roundBattle() {
  if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }
}

export async function battleRoyale() {
  if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }
}

export async function leaderboard() {
  if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }
}

export async function end() {
  if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }
  // Reset game state.
  state.hostId = undefined;
  state.vipId = undefined;
  state.round = 0;
  state.players = [];
  state.enemies = [];

  // NOTE: Sit here forever, as the room code will no longer be valid for reuse.
}

export async function options() {
  if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }
  // No options for clients yet.
  // Maybe sound effects and vibration?
}
