import * as trystero from "trystero";

const config: trystero.BaseRoomConfig = {
    appId: "feature-creeps-0.0.1",
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