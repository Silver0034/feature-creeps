// TODO: Currently untested.

import { Handshake } from "@utilities/web-socket"
import "./node_modules/simple-peer/simplepeer.min.js";

// A comprehensive list of commands to accommodate:
// getName: Handles the process of getting a username for a client.
//          The server requests this upon a successful connection.
//          The client uses this to provide the response.
//          The server also sends a command with this, alongside an "error", if the name is invalid.
// TODO: characterSheet: The server provides the player's current character sheet data.
// TODO: ability: The client provides a new ability in the "strength" or "weakness" fields.
//          The server also sends a command with this, alongside an "error", if the ability is invalid.
// TODO: setState: Sent by the server to inform the client to change state. Valid states come from enum GameState.

// TODO: Consider marking the first peer to connect as a "leader", which permits them to send additional commands. If this happens, be sure to send a command to inform them of this, so the client can unlock the extra UI associated with that.

export class WebRTCHost {
    private peers: { [key: string]: SimplePeer } = {};
    private handshake: Handshake | null = null;
    constructor() { }
    public OpenConnections(): void {
        this.handshake = new Handshake()
        function customHandler(event: MessageEvent<string>) {
            console.log(`Received message from client: ${event.data}`);
            // TODO: Negotiation takes more than naively creating a peer. You need to handle things based on room code, for instance. Perhaps the WebSocket server should handle a lot of this though?
            // TODO: I intend to use a standard format for all messages, which will include additional auth. Ideally, the WebSocket server will handle message filtering, but we can receive the data here and do things with it to reject certain handshakes automatically.

            const peer: SimplePeer = new SimplePeer({
                initiator: false, // The host always waits for clients to ask them to connect.
                trickle: false,
            });
            // Handle errors.
            peer.on("error", (err) => console.log("error", err));
            // Handle handshakes.
            peer.on("signal", (data) => {
                console.log("SIGNAL", JSON.stringify(data));
                // TODO: Include extra identifying info for for WebSocket routing purposes.
                this.handshake.send(JSON.stringify(data))
            });
            // Establish connection.
            peer.on("connect", () => {
                console.log("CONNECT");
                // Request a name.
                const request: object = {
                    command: "GetName"
                }
                peer.send(JSON.stringify(request))
            });
            // Close connection.
            // TODO: Is it appropriate to close the connection, or might they return later and reuse this peer?
            peer.on('close', () => {
                console.log("CLOSE");
                Object.keys(this.peers).forEach((key) => {
                    if (this.peers[key] === peer) {
                        delete this.peers[key];
                        return;
                    }
                });
            })
            // Receive data.
            // TODO: Handle data reception here (abilities, name, auth, etc.)
            // TODO: Always check the current game state to determine if a type of message is valid. Otherwise reject them.
            // This will interface with the game by directly modifying the game state.
            // I don't really like it, but that also means that many LLM inference steps should be put here too. I think I should separate each command into functions that are called from another file, to keep this whole thing from getting overwhelmingly bloated.
            // I should figure out how to end the client round communication once time runs out and figure out how to delay until any outstanding inference completes.
            peer.on("data", (data) => {
                console.log("data: " + data);
                if(!("command" in data)) {
                    console.log("Client did not provide a command. Ignoring.");
                    return;
                }
                if (data.command === "GetName") {
                    // TODO: Is there a way to validate against a schema or something? This might make things cleaner.
                    if(!("name" in data)) {
                        console.log("Client provided malformed data. Ignoring.");
                        return;
                    }
                    if (data.name in this.peers) {
                        console.log("Peer requested an existing name. Rejecting.");
                        const request: object = {
                            command: "GetName",
                            error: "duplicate"
                        }
                        peer.send(request)
                        return
                    } else {
                        // Associate the peer to the name.
                        this.peers[data.name] = peer;
                    }
                }
            });
            // Respond to the handshake.
            peer.signal(JSON.parse(event.data))
        }
        this.handshake.setHandleMessage(customHandler)
        this.handshake.connect()
    }
}
