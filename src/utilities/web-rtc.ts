import * as trystero from "trystero/mqtt";
import * as packageJson from "package.json"
// NOTE: A hard limit of 500 WebRTC connections are supported in Chrome.

const config: trystero.BaseRoomConfig & trystero.RelayConfig = {
  // Set the App ID based on the host, package name, and package version.
  appId: `${location.host}-${packageJson.name}-${packageJson.version}`,
  // NOTE: This doesn't do much, since it's plaintext in the browser. 
  // Better than nothing though.
  // TODO: Consider allowing end users to set this in the options menu.
  password: "F0r$up3rE@rth!",
  // These servers were pulled from public GitHub repos and thus are unreliable.
  // @ts-ignore: `turnConfig` is used by Trystero but missing from TS types.
  turnConfig: [
    { urls: "stun:stun.mxhichina.com:3478" },
    { urls: "stun:stun.qq.com:3478" },
    { urls: "stun:stun.relay.metered.ca:80" },
    { urls: "stun:stun.stunprotocol.org:3478" },
    {
      urls: "turn:192.158.29.39:3478?transport=tcp",
      credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
      username: "28224511:1379330808",
    },
    {
      urls: "turn:freeturn.net:3479",
      credential: "free",
      username: "free"
    },
    {
      urls: "turn:numb.viagenie.ca",
      credential: "muazkh",
      username: "webrtc@live.com",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "ef7DMSPS434PTQTXU2",
      credential: "9ulJ7QOhHyzMTpuk",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "ef8EOWQXK1M7HXY1AI",
      credential: "mor3P6U6DOFc1r3R",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efALYHAURNCX3DKZXI",
      credential: "JChoZQCUqDTEtIe1",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efD08GKZ1QV5X7KPMN",
      credential: "2vS3rl5sPO0tp3P9",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efEJ83ZSNV3TUWBYYP",
      credential: "G5OZ5QXWGNCwENLG",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efG2POA1I8C0LY0AMG",
      credential: "gFkpmRvk98yQWbqX",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efIBGB3O958JDVKXPS",
      credential: "6XwXXQLpUyfqwhjC",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efJOQ1TXPNAJYW2V54",
      credential: "BQ8uDasm0AkaePjZ",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efNFMA7S3AXKL4C9FV",
      credential: "qHpAu3uMlVCiUAlR",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efQB4HTEGI9W41QMFK",
      credential: "W1pfkptr9mSZn5Fe",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efQSLPKFVR1ANJGAHL",
      credential: "p1CPPouohCkB1MO2",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efQUQ79N77B5BNVVKF",
      credential: "N4EAUgpjMzPLrxSS",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efSIBKT5O2HI8UWT9S",
      credential: "wrMwtRjxCK5NRGqo",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efW0JWTTKTRB1KDP7M",
      credential: "wXrZmFxZJMbqx1Ky",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efWQ2IFY44Y2AKGB8H",
      credential: "xJxLKAYwJ0PUB8x2",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efZDXAYWZO2KVVVJTS",
      credential: "xaQMSAhkufhl53NW",
    },
    {
      urls: "turn:relay1.expressturn.com:3478",
      username: "efZIKNPZ0Y17GFG3WZ",
      credential: "HIYNupkIAHFXSgW8",
    },
    {
      urls: "turn:turn.anyfirewall.com:443?transport=tcp",
      credential: "webrtc",
      username: "webrtc",
    },
    {
      urls: "turn:turn.bistri.com:80",
      credential: "homeo",
      username: "homeo"
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "0a3a9293f3f8dd410138e0fb",
      credential: "JAYpV4YyYPL7JwX+",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "b0e07cdbd000e5aa7b547bf0",
      credential: "bXC9XyogFAsUZzJB",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "d9db324efc42dc0de5a21c53",
      credential: "SYWkpC1peCM6XTa2",
    },
    {
      urls:
        [
          "turn:a.relay.metered.ca:80",
          "turn:a.relay.metered.ca:80?transport=tcp",
          "turn:a.relay.metered.ca:443",
          "turn:a.relay.metered.ca:443?transport=tcp",
        ],
      username: "33c88ed716afa1a802b5116a",
      credential: "YlI1/qfkEWya3Q4p",
    },
    {
      urls:
        [
          "turn:global.relay.metered.ca:80",
          "turn:global.relay.metered.ca:80?transport=tcp",
          "turn:global.relay.metered.ca:443",
        ],
      username: "0a3a9293f3f8dd410138e0fb",
      credential: "JAYpV4YyYPL7JwX+",
    },
    {
      urls:
        [
          "turn:global.relay.metered.ca:80",
          "turn:global.relay.metered.ca:80?transport=tcp",
          "turn:global.relay.metered.ca:443",
        ],
      username: "b0e07cdbd000e5aa7b547bf0",
      credential: "bXC9XyogFAsUZzJB",
    },
    {
      urls:
        [
          "turn:global.relay.metered.ca:80",
          "turn:global.relay.metered.ca:80?transport=tcp",
          "turn:global.relay.metered.ca:443",
        ],
      username: "d9db324efc42dc0de5a21c53",
      credential: "SYWkpC1peCM6XTa2",
    },
  ]
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