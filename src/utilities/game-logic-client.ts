import { selfId } from "trystero";
import { initLlm, listModels } from "@utilities/openai";
import { promises } from "@utilities/promises"
import { balanceAbility, generateClass, validateAbility, combat, generateEnemy, genBattleRoyale } from "@utilities/prompts";
import { state, GameState, Role } from "@utilities/state";
import { tts, initTts, longSpeak } from "@utilities/tts";
import type { PlayerData } from "@utilities/state";

import { WebRTC } from "@utilities/web-rtc";
import { abilityMixin } from "@utilities/web-rtc/ability";
import { messageMixin } from "@utilities/web-rtc/message";
import { nameMixin } from "@utilities/web-rtc/name";
import { serverMixin } from "@utilities/web-rtc/server";
import { sheetMixin } from "@utilities/web-rtc/sheet";
import { updateMixin } from "@utilities/web-rtc/update";

// TODO: State logic for the client should actually be pretty different. We transition not on our own logic, but on state update calls made by the server.
import { promptWithValidation, runStateLogic } from "@utilities/game-logic-host";

const WebRTCClient = abilityMixin(messageMixin(nameMixin(serverMixin(sheetMixin(updateMixin(WebRTC))))));
let rtc: InstanceType<typeof WebRTCClient>;

let queryStrings: Record<string, string | null>;

export async function main(): Promise<void> {
  state.role = Role.Client;
}

async function init() {
  queryStrings = new Proxy(Object.create(null), {
    get: (_, prop: string) => new URLSearchParams(window.location.search).get(prop) ?? null,
  }) as Record<string, string | null>;
}

async function connect() {
  const roomId = queryStrings.r;
  if (!roomId) {
    throw Error("No room ID provided. Please enter a valid room ID and try again.");
  }
  rtc = new WebRTCClient(roomId);

  // Provide a name.
  let feedback = "";
  const name = promptWithValidation<string>(
    `${feedback}Please enter a name for your character.`,
    (input) => {
      // Client-side validation.
      if (input) {
        const validationResponse = rtc.validateName(input);
        if (validationResponse) {
          feedback = validationResponse + "\n";
          return null;
        }
        return input;
      }
      return null;
    }
  )
  if (!name) { throw Error("Invalid name provided."); }
  rtc.sendName({ name: name });

  // TODO: Press the start button.
  if (state.vipId == selfId) {

  }
}

async function intro() {
  // TODO: Skip intro.
  // Will require a way to kill the speaking early.
  if (state.vipId == selfId) {

  }
}

async function roundAbilities() {
  const ability = promptWithValidation<string>(
    `LEVEL UP!\nPlease enter a new ability for your character.`,
    (input) => {
      if (input) return input;
      return null;
    }
  );
  if (!ability) { throw Error("Invalid ability provided."); }
  rtc.sendAbility({ ability: ability });
}

async function roundBattle() {

}

async function battleRoyale() {

}

async function leaderboard() {

}

async function end() {
  // Reset game state.
  state.serverId = undefined;
  state.vipId = undefined;
  state.round = 0;
  state.players = [];
  state.enemies = [];
}

async function options() {

}
