import { WebRTC } from "@utilities/web-rtc";
import { state } from "@utilities/state";

type NameData = { name: string };

export function nameMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    public sendName!: (data: NameData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerNameActions();
    }
    private registerNameActions(): void {
      const [sendName, getName] = this.room.makeAction<NameData>("name");
      this.sendName = sendName;
      getName((data, peerId) => {
        try {
          if (!this.isNameData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          console.log(`Got name from ${peerId}: ${data.name}`);
          const player = state.players.find(player => player.peerId === peerId);
          if (!player) {
            throw Error(`Could not find player with peerId ${peerId}`);
          }
          // TODO: Names should be unique. Add a check and error handling to address this.
          player.sheet.name = data.name;
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
  };
}