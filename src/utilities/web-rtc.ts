import * as trystero from "trystero";

const config: trystero.BaseRoomConfig = {
    // NOTE: Change this whenever the game is updated,
    // or else there may be a client version mismatch.
    appId: "feature-creeps-0.0.1",
    // NOTE: This doesn't do much, since it's plaintext in the browser. 
    // Better than nothing though.
    password: "F0r$up3rE@rth!"
};

export class WebRTC {
    room: trystero.Room;
    constructor(roomId: string) {
        console.log(`my peer ID is ${trystero.selfId}`);
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
        console.log(`${peerId} joined`)
    }
    protected onPeerLeave(peerId: string): void {
        console.log(`${peerId} left`)
    }
}