import { state, Role } from "@utilities/state";

export let elements = {
  gameState: document.getElementById("gameState") as HTMLInputElement,
  host: {
    timer: document.getElementById("timer") as HTMLElement,
    playerCount: document.getElementById("playerCount") as HTMLElement,
    enemy: document.getElementById("enemy") as HTMLInputElement,
    player: document.getElementById("player") as HTMLInputElement,
    story: document.getElementById("story") as HTMLInputElement,
    winner: document.getElementById("winner") as HTMLInputElement,
    startButton: document.getElementById("startButton") as HTMLButtonElement,
    optionsButton: document.getElementById("optionsButton") as HTMLButtonElement,
    joinDiv: document.getElementById("joinDiv") as HTMLInputElement,
    joinLink: document.getElementById("joinLink") as HTMLAnchorElement,
    copyLinkButton: document.getElementById("copyLinkButton") as HTMLButtonElement,
    roomQr: document.getElementById("roomQr") as HTMLInputElement, // TODO: Not reported by validate?
    roomCode: document.getElementById("roomCode") as HTMLInputElement,
    goButton: document.getElementById("goButton") as HTMLButtonElement,
    leaderboardText: document.getElementById("leaderboardText") as HTMLElement,
    playersStatus: document.getElementById("playersStatus") as HTMLElement,
    loadStatus: document.getElementById("loadStatus") as HTMLElement,
    options: {
      skipIntro: document.getElementById("skipIntro") as HTMLInputElement,
      autoFullscreen: document.getElementById("autoFullscreen") as HTMLInputElement,
      numRounds: document.getElementById("numRounds") as HTMLInputElement,
      inferenceEngine: document.getElementById("inferenceEngine") as HTMLSelectElement,
      inferenceModelRow: document.getElementById("inferenceModelRow") as HTMLInputElement,
      inferenceModel: document.getElementById("inferenceModel") as HTMLSelectElement,
      temperature: document.getElementById("temperature") as HTMLInputElement,
      tempValue: document.getElementById("tempValue") as HTMLElement,
      inferenceApiRow: document.getElementById("inferenceApiRow") as HTMLInputElement,
      inferenceApiUrl: document.getElementById("inferenceApiUrl") as HTMLInputElement,
      inferenceApiKey: document.getElementById("inferenceApiKey") as HTMLInputElement,
      ttsType: document.getElementById("ttsType") as HTMLSelectElement,
      ttsVoice: document.getElementById("ttsVoice") as HTMLSelectElement,
      saveConfig: document.getElementById("saveConfig") as HTMLElement,
    }
  },
  client: {
    timer: document.getElementById("timer") as HTMLElement,
    name: document.getElementById("name") as HTMLElement,
    feedback: document.getElementById("feedback") as HTMLInputElement,
    roomDiv: document.getElementById("roomDiv") as HTMLInputElement,
    roomId: document.getElementById("roomId") as HTMLInputElement,
    submitRoomId: document.getElementById("submitRoomId") as HTMLButtonElement,
    nameDiv: document.getElementById("nameDiv") as HTMLInputElement,
    nameInput: document.getElementById("nameInput") as HTMLInputElement,
    submitName: document.getElementById("submitName") as HTMLButtonElement,
    optionsButton: document.getElementById("optionsButton") as HTMLButtonElement,
    connectDiv: document.getElementById("connectDiv") as HTMLInputElement,
    startGame: document.getElementById("startGame") as HTMLButtonElement,
    introDiv: document.getElementById("introDiv") as HTMLInputElement,
    skipInto: document.getElementById("skipInto") as HTMLButtonElement,
    abilityDiv: document.getElementById("abilityDiv") as HTMLInputElement,
    abilityInput: document.getElementById("abilityInput") as HTMLInputElement,
    submitAbility: document.getElementById("submitAbility") as HTMLButtonElement,
    submitAbilityFallback: document.getElementById("submitAbilityFallback") as HTMLButtonElement,
    optionsDiv: document.getElementById("optionsDiv") as HTMLInputElement,
    options: {
      soundEffects: document.getElementById("soundEffects") as HTMLInputElement,
      testSoundEffects: document.getElementById("testSoundEffects") as HTMLButtonElement,
      vibrate: document.getElementById("vibrate") as HTMLInputElement,
      testVibrate: document.getElementById("testVibrate") as HTMLButtonElement,
      saveConfig: document.getElementById("saveConfig") as HTMLButtonElement,
    },
    sheet: document.getElementById("sheet") as HTMLElement,
    messages: document.getElementById("messages") as HTMLElement,
  },
}

export function validateElements() {
  if (state.role == Role.Host) {
    validate(elements.host);
  }
  if (state.role == Role.Client) {
    validate(elements.client);
  }
}

type DOMElement = HTMLElement | HTMLInputElement | HTMLButtonElement | HTMLSelectElement;
function isDOMElement(element: unknown): element is DOMElement {
  return element instanceof HTMLElement;
}

function validate(elements: { [key: string]: unknown }, path: string = '') {
  for (const [key, value] of Object.entries(elements)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (isDOMElement(value)) {
      // console.log(`${value.id}`);
    } else if (typeof value === 'object' && value !== null) {
      validate(value as { [key: string]: unknown }, currentPath);
    } else if (value == null) {
      console.error(`Missing value for "${currentPath}"`);
    }
  }
}
