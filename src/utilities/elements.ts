import { state, Role } from "@utilities/state";

// TODO: Consider merging this file with state.ts.

export let elements = {
  gameState: document.getElementById("gameState") as HTMLInputElement,
  host: {
    playerCount: document.getElementById("playerCount") as HTMLElement,
    story: document.getElementById("story") as HTMLInputElement,
    startButton: document.getElementById("startButton") as HTMLButtonElement,
    optionsButton: document.getElementById("optionsButton") as HTMLButtonElement,
    joinDiv: document.getElementById("joinDiv") as HTMLInputElement,
    joinLink: document.getElementById("joinLink") as HTMLAnchorElement,
    roomQr: document.getElementById("roomQr") as HTMLInputElement, // TODO: Not reported by validate?
    roomCode: document.getElementById("roomCode") as HTMLInputElement,
    goButton: document.getElementById("goButton") as HTMLButtonElement,
    options: {
      numRounds: document.getElementById("numRounds") as HTMLInputElement,
      inferenceEngine: document.getElementById("inferenceEngine") as HTMLSelectElement,
      inferenceModel: document.getElementById("inferenceModel") as HTMLSelectElement,
      temperature: document.getElementById("temperature") as HTMLInputElement,
      inferenceApiUrl: document.getElementById("inferenceApiUrl") as HTMLInputElement,
      inferenceApiKey: document.getElementById("inferenceApiKey") as HTMLInputElement,
      ttsType: document.getElementById("ttsType") as HTMLSelectElement,
      ttsVoice: document.getElementById("ttsVoice") as HTMLSelectElement,
      saveConfig: document.getElementById("saveConfig") as HTMLElement,
    }
  },
  client: {
    nameDiv: document.getElementById("nameDiv") as HTMLInputElement,
    roomDiv: document.getElementById("roomDiv") as HTMLInputElement,
    abilityDiv: document.getElementById("abilityDiv") as HTMLInputElement,
    roomId: document.getElementById("roomId") as HTMLInputElement,
    submitRoomId: document.getElementById("submitRoomId") as HTMLButtonElement,
    nameInput: document.getElementById("nameInput") as HTMLInputElement,
    submitName: document.getElementById("submitName") as HTMLButtonElement,
    abilityInput: document.getElementById("abilityInput") as HTMLInputElement,
    submitAbility: document.getElementById("submitAbility") as HTMLButtonElement,
  },
}

// TODO: Validate the existence of these fields based on what we expect.
function validateElements() {
  // if (state.role == Role.Host) {
  validate(elements.host);
  // }
  // if (state.role == Role.Client) {
  validate(elements.client);
  // }
}

type DOMElement = HTMLElement | HTMLInputElement | HTMLButtonElement | HTMLSelectElement;
function isDOMElement(element: unknown): element is DOMElement {
  return element instanceof HTMLElement;
}

function validate(elements: { [key: string]: unknown }) {
  Object.values(elements).forEach((element) => {
    if (isDOMElement(element)) {
      // Now TypeScript knows that element is a DOMElement
      console.log(`${element.id}`);
    } else if (typeof element === 'object' && element !== null) {
      // If the element is an object, recursively validate its properties
      validate(element as { [key: string]: unknown });
    } else {
      console.log(`Missing ${element}`);
    }
  });
}

validateElements();