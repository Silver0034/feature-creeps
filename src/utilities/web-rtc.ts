// TODO: Nonfunctional. Needs a total rework. Use rtc-test.astro as reference.

import { state } from "@utilities/state";
import { Peer } from "peerjs";

export function PeerTest(name: string, target: string): void {
    const peer = new Peer(name, {debug: 3});
    const conn = peer.connect(target);
    conn.on("open", () => {
        conn.send("hi!");
    });
    conn.on("error", (err) => {
        console.log(err);
      });
    peer.on("connection", (conn) => {
        conn.on("data", (data) => {
            console.log(data);
        });
        conn.on("open", () => {
            conn.send("hello!");
        });
    });
    peer.on('open', function(id) {
        console.log('My peer ID is: ' + id);
    });
}

// export function Send(msg: string): void {
//     conn.send(msg)
//     return
// }