import { selfId } from "trystero";
import { WebRTC } from "@utilities/web-rtc";
import { state, Role } from "@utilities/state";
import { CharacterSheet } from "@utilities/character-sheet";

type HandshakeData = { serverId: string, secret: string };

export function handshakeMixin<TBase extends new (...args: any[]) => WebRTC>(Base: TBase) {
  return class extends Base {
    public sendHandshake!: (data: HandshakeData, peerId?: string) => void;
    constructor(...args: any[]) {
      super(...args);
      this.registerHandshakeActions();
    }
    private registerHandshakeActions(): void {
      const [sendHandshake, getHandshake] = this.room.makeAction<HandshakeData>("handshake");
      this.sendHandshake = sendHandshake;
      getHandshake((data, peerId) => {
        try {
          if (!this.isHandshakeData(data)) {
            throw new Error(`Invalid data payload: ${JSON.stringify(data)}`);
          }
          console.log(`Got handshake from ${peerId}: ${JSON.stringify(data)}`);

          if (state.role == Role.Host) {
            console.log(`Sending requested handshake to ${peerId}`);
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
            this.sendHandshake({ serverId: selfId, secret: secret }, peerId);
          } else {
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
          }

          state.serverId = data.serverId;
        } catch (error) {
          console.error(error);
        }
      });
    }
    // TODO: This is broken. FIgure out why. In the interim, the client sends an empty sendHandshake() to implicitly request the info.
    // protected override onPeerJoin(peerId: string): void {
    //   super.onPeerJoin(peerId);

    //   if (state.role == Role.Host) {
    //     console.log(`Sending handshake to ${peerId}`);

    //     const buffer = new Uint8Array(48);
    //     crypto.getRandomValues(buffer);
    //     const secret = Array.from(buffer).map(b => b.toString(16).padStart(2, "0")).join("");

    //     const player = state.players.find(player => player.peerId === peerId);
    //     if (!player) {
    //       state.players.push({
    //         sheet: new CharacterSheet(),
    //         secret: secret,
    //         peerId: peerId
    //       });
    //     } else {
    //       player.secret = secret;
    //     }

    //     this.sendHandshake({ serverId: selfId, secret: secret }, peerId);
    //   }
    // }
    private isHandshakeData(data: any): data is HandshakeData {
      return (
        typeof data === "object" &&
        data !== null &&
        "serverId" in data &&
        typeof data.serverId === "string" &&
        "secret" in data &&
        typeof data.secret === "string"
      );
    }
  };
}
