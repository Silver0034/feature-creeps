import * as trystero from "trystero/mqtt";
import * as packageJson from "package.json"
// NOTE: A hard limit of 500 WebRTC connections are supported in Chrome.

// TODO: Consider setting up TURN servers to support phones on mobile data.

const config: trystero.BaseRoomConfig & trystero.RelayConfig = {
  // Set the App ID based on the host, package name, and package version.
  appId: `${location.host}-${packageJson.name}-${packageJson.version}`,
  // NOTE: This doesn't do much, since it's plaintext in the browser. 
  // Better than nothing though.
  // TODO: Consider allowing end users to set this in the options menu.
  password: "F0r$up3rE@rth!",
  // NOTE: `turnConfig` is used by Trystero but missing from TS types.
  // @ts-ignore
  // turnConfig: [
  //   {
  //     // single string or list of strings of urls to access TURN server.
  //     urls: ['turn:your-turn-server.ok:1979'],
  //     username: 'username',
  //     credential: 'password'
  //   }
  // ]
};

export class WebRTC {
  room: trystero.Room;
  constructor(roomId: string) {
    console.log(`My peer ID is ${trystero.selfId}`);
    console.log(`The app ID is ${config.appId}`);
    this.room = trystero.joinRoom(config, roomId);
    this.registerActions();
  }
  protected leave(): void {
    this.room.leave();
  }
  protected getPeers(): Record<string, RTCPeerConnection> {
    return this.room.getPeers();
  }
  protected registerActions(): void {
    this.room.onPeerJoin(this.onPeerJoin);
    this.room.onPeerLeave(this.onPeerLeave);
  }
  protected onPeerJoin(peerId: string): void {
    console.log(`${peerId} joined`);
  }
  protected onPeerLeave(peerId: string): void {
    console.log(`${peerId} left`);
  }
}