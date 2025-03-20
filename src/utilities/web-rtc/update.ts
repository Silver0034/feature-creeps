import { WebRTC } from "@utilities/web-rtc";
import { state, GameState, Role } from "@utilities/state";
import * as client from "@utilities/game-logic-client";

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
      getUpdate(async (data, peerId) => {
        try {
          if (!this.isUpdateData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          // Verify that peerId is the host.
          if (peerId !== state.hostId) {
            throw new Error(`Received state change request from a non-host peer: ${peerId}`);
          }
          if (state.role != Role.Client) {
            throw new Error(`Ignoring state change sent by ${peerId} to a ${Role[state.role]}: ${GameState[data.state]}`);
          }
          console.log(`Got state from ${peerId}: ${data.state}`);
          // Update state.
          state.gameState = data.state;
          // Display it in the UI.
          // NOTE: Redundant with typical client approach.
          // if (elements.gameState) { elements.gameState.textContent = GameState[state.gameState]; }

          // Clients call their relevant methods from here.
          if (state.role = Role.Client) {
            switch (state.gameState) {
              case GameState.Options: { await client.options(); break; }
              case GameState.Init: { await client.init(); break; }
              case GameState.Connect: { await client.connect(); break; }
              case GameState.Intro: { await client.intro(); break; }
              case GameState.RoundAbilities: { await client.roundAbilities(); break; }
              case GameState.RoundBattle: { await client.roundBattle(); break; }
              case GameState.BattleRoyale: { await client.battleRoyale(); break; }
              case GameState.Leaderboard: { await client.leaderboard(); break; }
              case GameState.End: { await client.end(); break; }
              default: { throw new Error("Invalid GameState"); }
            }
          }
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