import AsyncLock from "async-lock";
import { WebRTC } from "@utilities/web-rtc";
import { state } from "@utilities/state";

type NameData = { name: string };

export function nameMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    private lock = new AsyncLock();
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
          console.log(`Got name from ${peerId}: ${data.name}`);
          const player = state.players.find(player => player.peerId === peerId);
          if (!player) {
            throw Error(`Could not find player with peerId ${peerId}`);
          }
          // Host-side, this is a data race.
          // If we aren't careful, multiple users could get the same name.
          await this.lock.acquire("name-validation", async () => {
            const validationError = this.validateName(data.name);
            if (!validationError) {
              player.sheet.name = data.name;
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
    // NOTE: We can do client-side name duplication validation easily if sendNames are broadcast globally, since we can store them and find them here.
    public validateName(name: string): string | null {
      if (state.players.some(player => player.sheet.name === name)) { return "Name already in use."; }
      if (name.length > 15) { return "Name is too long (>15 characters)."; }
      if (name.length <= 0) { return "Please fill in a name."; }
      return null;
    }
  };
}