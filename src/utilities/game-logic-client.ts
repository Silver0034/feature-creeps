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

const WebRTCClient = abilityMixin(messageMixin(nameMixin(serverMixin(sheetMixin(updateMixin(WebRTC))))));
let rtc: InstanceType<typeof WebRTCClient>;

let queryStrings: Record<string, string | null>;

function updateStateElement() {
  elements.gameState.textContent = GameState[state.gameState];
}

export async function main(): Promise<void> {
  state.role = Role.Client;
  await init();
}

export async function init() {
  updateStateElement();
  queryStrings = new Proxy(Object.create(null), {
    get: (_, prop: string) => new URLSearchParams(window.location.search).get(prop) ?? null,
  }) as Record<string, string | null>;
  await connect();
}

export async function connect() {
  updateStateElement();
  let room = queryStrings.r;

  if (!room) {
    // Provide a room code.
    elements.client.roomDiv.style.display = "inline";
    await new Promise<void>((resolve) => {
      elements.client.submitRoomId.addEventListener("click", () => {
        room = elements.client.roomId.value.trim();
        resolve();
      });
      elements.client.roomId.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          room = elements.client.roomId.value.trim();
          resolve();
        }
      });
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
  elements.client.nameDiv.style.display = "inline";
  function nameSender() {
    const input = elements.client.nameInput.value.trim();
    if (input) {
      const validationResponse = rtc.validateName(input);
      if (!validationResponse) {
        rtc.sendName({ name: input }, state.hostId);
        // TODO: May need to display this again if we get name entry feedback.
        elements.client.nameDiv.style.display = "none";
      } else {
        console.warn(`Invalid name: ${validationResponse}`);
      }
    }
  }
  elements.client.submitName.addEventListener("click", () => {
    nameSender();
  });
  elements.client.nameInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      nameSender();
    }
  });

  // TODO: Provide a selection of character portraits and sounds.

  // TODO: Press the start button.
  // TODO: Make a skip mixin.
  if (state.vipId == selfId) {

  }
}

export async function intro() {
  updateStateElement();
  // TODO: Skip intro.
  // TODO: Will require a way to kill TTS playback early.
  if (state.vipId == selfId) {

  }
}

export async function roundAbilities() {
  updateStateElement();
  // Show current player sheet.
  console.log(state.players.find((player) => player.peerId == selfId)?.sheet.toString());

  function abilitySender() {
    const ability = elements.client.abilityInput.value.trim();
    rtc.sendAbility({ ability: ability }, state.hostId);
    elements.client.abilityInput.value = "";
    elements.client.abilityDiv.style.display = "none";
  }

  // LEVEL UP!
  // Please enter a new ability for your character:
  elements.client.abilityDiv.style.display = "inline";
  elements.client.submitAbility.addEventListener("click", () => {
    abilitySender();
  });
  elements.client.abilityInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      abilitySender();
    }
  });

  // NOTE: May getAbilityFB() if this ability doesn't pass LLM validation.
  // May have to send one in multiple times.

  // TODO: Consider an LLM-generated fallback if the player can't figure out an
  // ability in time.
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

  // NOTE: Sit here forever, as the room code will no longer be valid for reuse.
}

export async function options() {
  updateStateElement();
  // No options for clients yet.
  // Maybe sound effects and vibration?
}

// TODO: Add player name to the top of the screen.