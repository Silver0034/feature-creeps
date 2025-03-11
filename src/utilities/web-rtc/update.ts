import { WebRTC } from "@utilities/web-rtc";
import { state, GameState } from "@utilities/state";

type UpdateData = { state: GameState };

export function updateMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    public sendUpdate!: (data: UpdateData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerUpdateActions();
    }
    private registerUpdateActions(): void {
      const [sendUpdate, getUpdate] = this.room.makeAction<UpdateData>("update");
      this.sendUpdate = sendUpdate;
      getUpdate((data, peerId) => {
        try {
          if (!this.isUpdateData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          console.log(`Got state from ${peerId}: ${data.state}`);
          // TODO: Verify that peerId is the host.
          // Update state.
          state.gameState = data.state;
        } catch (error) {
          console.error(error);
        }
      });
    }
    private isUpdateData(data: any): data is UpdateData {
      return (
        typeof data === "object" &&
        data !== null &&
        "state" in data &&
        Object.values(GameState).includes(data.state)
      );
    }
  };
}