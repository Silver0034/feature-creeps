import * as AsyncLock from "async-lock";
import { elements } from "@utilities/elements";
import { notify } from "@utilities/game-logic-client";
import { setPlayerStatus } from "@utilities/players-list";
import { state, GameState, Role } from "@utilities/state";
import { WebRTC } from "@utilities/web-rtc";

type NameData = { name: string };
type NameFBData = { isValid: boolean, feedback: string, name: string };

export function nameMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    private nameLock = new AsyncLock.default();
    public sendName!: (data: NameData, peerId?: string) => void;
    public sendNameFB!: (data: NameFBData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerNameActions();
    }
    private registerNameActions(): void {
      const [sendName, getName] = this.room.makeAction<NameData>("name");
      this.sendName = sendName;
      getName(async (data, peerId) => {
        try {
          if (!this.isNameData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          if (state.role != Role.Host) {
            throw new Error(`Ignoring name sent by ${peerId} to a ${Role[state.role]}: ${data.name}`);
          }
          if (state.gameState != GameState.Connect) {
            throw new Error(`Ignoring name sent by ${peerId} while in the ${GameState[state.gameState]} state: ${data.name}`);
          }
          console.log(`Got name from ${peerId}: ${data.name}`);
          const player = state.players.find(player => player.peerId === peerId);
          if (!player) {
            throw Error(`Could not find player with peerId ${peerId}`);
          }
          // Use a lock to prevent multiple players from getting the same name.
          await this.nameLock.acquire("name-validation", async () => {
            const validationError = this.validateName(data.name);
            if (!validationError) {
              player.sheet.name = data.name;
              setPlayerStatus(player, "Joined!");
            } else {
              setPlayerStatus(player, "Submitted an invalid name.");
              console.warn(`Name validation failed for ${data.name}: ${validationError}`);
            }
            sendNameFB({
              isValid: !Boolean(validationError),
              feedback: validationError ? validationError : "",
              name: data.name
            }, peerId);
          });
        } catch (error) {
          console.error(error);
        }
      });
      const [sendNameFB, getNameFB] = this.room.makeAction<NameFBData>("NameFB");
      this.sendNameFB = sendNameFB;
      getNameFB(async (data, peerId) => {
        try {
          if (!this.isNameFBData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          if (state.role != Role.Client) {
            throw new Error(`Ignoring name feedback sent by ${peerId} to a ${Role[state.role]}: ${data.feedback}`);
          }
          if (state.gameState != GameState.Connect) {
            throw new Error(`Ignoring name feedback sent by ${peerId} while in the ${GameState[state.gameState]} state: ${data.feedback}`);
          }
          if (data.isValid) {
            console.log("Name accepted!");
            const taskElement = document.createElement('p');
            taskElement.textContent = `Name accepted!`;
            elements.client.messages.appendChild(taskElement);
            // Clear the text after 5 seconds.
            setTimeout(() => {
              if (elements.client.messages.contains(taskElement)) {
                elements.client.messages.removeChild(taskElement);
              }
            }, 5000);
            // Add player name to the top of the screen.
            elements.client.name.innerText = `Name: ${data.name}`;
            return;
          }
          console.log(`Got name feedback from ${peerId}: ${data.feedback}`);
          this.HandleInvalidName(data.feedback);
        } catch (error) {
          console.error(error);
        }
      });
    }
    private isNameData(data: any): data is NameData {
      return (
        typeof data === "object" &&
        data !== null &&
        "name" in data &&
        typeof data.name === "string"
      );
    }
    private isNameFBData(data: any): data is NameFBData {
      return (
        typeof data === "object" &&
        data !== null &&
        "feedback" in data &&
        typeof data.feedback === "string" &&
        "isValid" in data &&
        typeof data.isValid === "boolean" &&
        "name" in data &&
        typeof data.name === "string"
      );
    }
    public validateName(name: string): string | null {
      const maxLength = 30;
      if (name.length <= 0) {
        return "Please fill in a name.";
      } else if (name.length > maxLength) {
        return `Name is too long (>${maxLength} characters).`;
      }
      // NOTE: Client-side name duplication validation is impractical because
      // the client has no view into who, if anyone, canonically "owns" any
      // particular name. We must rely on the host to check this for us.
      if (state.players.some(player => player.sheet.name === name)) {
        return "Name already in use.";
      }
      return null;
    }
    public HandleInvalidName(feedback: string) {
      if (state.role != Role.Client) {
        throw new Error(`Triggered handling of an invalid name on a non-client: ${feedback}`);
      }
      elements.client.feedback.innerText = `Invalid name: ${feedback}`;

      // Re-enable name form in the GUI.
      elements.client.nameDiv.style.display = "block";

      // Make sure the user knows that they need to revise their name.
      notify();
    }
  };
}
