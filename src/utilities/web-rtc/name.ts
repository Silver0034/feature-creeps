import * as AsyncLock from "async-lock";
import { elements } from "@utilities/elements";
import { state, GameState, Role } from "@utilities/state";
import { WebRTC } from "@utilities/web-rtc";

// TODO: Provide name feedback to verify that the name was valid server side, or to permit reentry.

type NameData = { name: string };

export function nameMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    private nameLock = new AsyncLock.default();
    public sendName!: (data: NameData, peerId?: string) => void;
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
              // TODO: Add name feedback if it fails to validate with the host.
              console.warn(`Name validation failed for ${data.name}: ${validationError}`);
            }
          });
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
    public validateName(name: string): string | null {
      if (name.length > 30) { return "Name is too long (>30 characters)."; }
      if (name.length <= 0) { return "Please fill in a name."; }
      // TODO: We can do an initial client-side name duplication validation
      // easily if sendName() is broadcast globally, since we can store them and
      // find them here.
      if (state.players.some(player => player.sheet.name === name)) {
        return "Name already in use.";
      }
      return null;
    }
  };
}
