import * as AsyncLock from "async-lock";
import { selfId } from "trystero/mqtt";
import { CharacterSheet } from "@utilities/character-sheet";
import { elements } from "@utilities/elements";
import { state, GameState, Role } from "@utilities/state";
import { WebRTC } from "@utilities/web-rtc";

// Announces that this peer is the game server.

type ServerData = { secret: string, vipId: string };

export function serverMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    private vipLock = new AsyncLock.default();
    private connectTaskElement: HTMLElement = document.createElement('p');
    public sendServer!: (data: ServerData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerServerActions();
    }
    private registerServerActions(): void {
      if (state.role == Role.Client) {
        this.connectTaskElement = document.createElement('p');
        this.connectTaskElement.textContent = `Connecting to host...`;
        elements.client.messages.appendChild(this.connectTaskElement);
      }
      this.room.onPeerJoin(this.onPeerJoin.bind(this));

      const [sendServer, getServer] = this.room.makeAction<ServerData>("server");
      this.sendServer = sendServer;
      getServer((data, peerId) => {
        try {
          if (!this.isServerData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          if (state.role != Role.Client) {
            throw new Error(`Ignoring server info sent by ${peerId} to a ${Role[state.role]}`);
          }

          console.log(`${peerId} is the server: ${JSON.stringify(data)}`);
          this.connectTaskElement.textContent = `Successfully connected to the host!`;
          // Clear the text after 5 seconds.
          setTimeout(() => {
            if (elements.client.messages.contains(this.connectTaskElement)) {
              elements.client.messages.removeChild(this.connectTaskElement);
            }
          }, 5000);

          // Hide the room code entry. We have found a working room.
          elements.client.roomDiv.style.display = "none";

          // Store the secret in case we need to verify our identity to the server later.
          const player = state.players.find(player => player.peerId === selfId);
          if (!player) {
            state.players.push({
              sheet: new CharacterSheet(),
              secret: data.secret,
              peerId: selfId,
              status: ""
            });
          } else {
            player.secret = data.secret;
          }

          // Keep track of the server to know when it's the server sending messages.
          state.hostId = peerId;
          // Keep track of the VIP.
          state.vipId = data.vipId;
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

        // The first player to join becomes the VIP.
        // TODO: This may be the first person to join, but this player may not
        // provide a name in time and will then not be in the game. Consider
        // this carefully.
        this.vipLock.acquire(peerId, async () => {
          if (!state.vipId) {
            state.vipId = peerId;
            console.log(`${state.vipId} has been assigned as the VIP.`);
          }
        });

        const player = state.players.find(player => player.peerId === peerId);
        if (!player) {
          state.players.push({
            sheet: new CharacterSheet(),
            secret: secret,
            peerId: peerId,
            status: "Joined."
          });
        } else {
          player.secret = secret;
        }

        this.sendServer({ secret: secret, vipId: state.vipId! }, peerId);
      } else if (state.role = Role.Client) {
        // Track the players that join.
        const player = state.players.find(player => player.peerId === peerId);
        if (!player) {
          state.players.push({
            sheet: new CharacterSheet(),
            secret: "",
            peerId: peerId,
            status: ""
          });
        }
      }
    }
    private isServerData(data: any): data is ServerData {
      return (
        typeof data === "object" &&
        data !== null &&
        "secret" in data &&
        typeof data.secret === "string" &&
        "vipId" in data &&
        typeof data.vipId === "string"
      );
    }
  };
}
