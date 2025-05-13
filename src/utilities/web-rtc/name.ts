import * as AsyncLock from "async-lock";
import { elements } from "@utilities/elements";
import { state, GameState, Role } from "@utilities/state";
import { WebRTC } from "@utilities/web-rtc";

type NameData = { name: string };
type NameFBData = { isValid: boolean, feedback: string };

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
        // TODO: The first player to provide their name should be the VIP.
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
          // Host-side, this is a data race.
          // If we aren't careful, multiple users could get the same name.
          await this.nameLock.acquire("name-validation", async () => {
            const validationError = this.validateName(data.name);
            if (!validationError) {
              player.sheet.name = data.name;
              elements.host.playerCount.textContent =
                (parseInt(elements.host.playerCount.innerText) + 1)
                  .toString();
            } else {
              console.warn(`Name validation failed for ${data.name}: ${validationError}`);
            }
            sendNameFB({
              isValid: !Boolean(validationError),
              feedback: validationError ? validationError : ""
            });
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
        typeof data.isValid === "boolean"
      );
    }
    public validateName(name: string): string | null {
      const maxLength = 30;
      if (name.length <= 0) {
        return "Please fill in a name.";
      } else if (name.length > maxLength) {
        return `Name is too long (>${maxLength} characters).`;
      }
      // TODO: We can do an initial client-side name duplication validation
      // easily if sendName() is broadcast globally, since we can store them and
      // find them here.
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
      elements.client.nameDiv.style.display = "inline";

      // Make sure the user knows that they need to revise their name.
      // TODO: Make this optional?
      navigator.vibrate(200);
      // Play a notification tone.
      const audio = new Audio("/sounds/bottleTap.flac");
      audio.play().catch(error => {
        console.error("Failed to play notification tone:", error);
      });
    }
  };
}
