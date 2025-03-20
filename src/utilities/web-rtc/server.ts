import { selfId } from "trystero/mqtt";
import { CharacterSheet } from "@utilities/character-sheet";
import { elements } from "@utilities/elements";
import { state, GameState, Role } from "@utilities/state";
import { WebRTC } from "@utilities/web-rtc";

// Announces that this peer is the game server.

type ServerData = { secret: string };

export function serverMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    public sendServer!: (data: ServerData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerServerActions();
    }
    private registerServerActions(): void {
      this.room.onPeerJoin(this.onPeerJoin.bind(this));

      const [sendServer, getServer] = this.room.makeAction<ServerData>("server");
      this.sendServer = sendServer;
      getServer((data, peerId) => {
        try {
          if (!this.isServerData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          if (state.role != Role.Client) {
            throw new Error(`Ignoring server info sent by ${peerId} to a ${Role[state.role]}: ${data.secret}`);
          }
          console.log(`${peerId} is the server: ${JSON.stringify(data)}`);

          // Hide the room code entry. We have found a working room.
          if (elements.roomDiv) { elements.roomDiv.style.display = "none"; }

          // Store the secret in case we need to verify our identity to the server later.
          const player = state.players.find(player => player.peerId === selfId);
          if (!player) {
            state.players.push({
              sheet: new CharacterSheet(),
              secret: data.secret,
              peerId: selfId
            });
          } else {
            player.secret = data.secret;
          }

          // Keep track of the server to know when it's the server sending messages.
          state.hostId = peerId;
        } catch (error) {
          console.error(error);
        }
      });
    }
    protected override onPeerJoin(peerId: string): void {
      super.onPeerJoin(peerId);

      // TODO: Admit audience members here.
      if (state.role == Role.Host && state.gameState == GameState.Connect) {
        console.log(`Sending server to ${peerId}`);

        const buffer = new Uint8Array(48);
        crypto.getRandomValues(buffer);
        const secret = Array.from(buffer).map(b => b.toString(16).padStart(2, "0")).join("");

        const player = state.players.find(player => player.peerId === peerId);
        if (!player) {
          state.players.push({
            sheet: new CharacterSheet(),
            secret: secret,
            peerId: peerId
          });
        } else {
          player.secret = secret;
        }

        this.sendServer({ secret: secret }, peerId);
      } else if (state.role = Role.Client) {
        // Track the players that join.
        const player = state.players.find(player => player.peerId === peerId);
        if (!player) {
          state.players.push({
            sheet: new CharacterSheet(),
            secret: "",
            peerId: peerId
          });
        }
      }
    }
    private isServerData(data: any): data is ServerData {
      return (
        typeof data === "object" &&
        data !== null &&
        "secret" in data &&
        typeof data.secret === "string"
      );
    }
  };
}
