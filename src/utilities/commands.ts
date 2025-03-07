// TODO: Rework this to use Trystero API instead.

import { CharacterSheet } from "@utilities/character-sheet";
import { GameState, state } from "@utilities/state";
import { Handshake } from "@utilities/web-socket";
import { randomBytes } from "crypto";
import WebSocketClient from "ws";
import SimplePeer, * as Peer from "simple-peer";
import { IsStrength } from "@utilities/prompts"

export enum Role {
    Server,
    Host,
    Client,
    VIP
}

interface PeerInfo {
    secret: string,
    client: WebSocketClient,
}
// Data associated with a specific room ID.
interface RoomInfo {
    host: PeerInfo,
    // Data associated with a specific client name.
    clients: Map<string, PeerInfo>,
}
class RoomManager {
    private roomInfo = new Map<string, RoomInfo>();
    constructor() { }
    public AddHost(host: WebSocketClient, roomId: string, secret: string) {
        this.roomInfo.set(roomId, {
            host: {
                secret: secret,
                client: host,
            },
            clients: new Map<string, PeerInfo>(),
        });
    }
    public UpdateHost(host: WebSocketClient, roomId: string | undefined, secret: string | undefined): [boolean, string] {
        if (!roomId) {
            return [false, "Missing required roomID field."];
        }
        const roomInfo = this.roomInfo.get(roomId);
        if (!roomInfo) {
            return [false, "Requested a room that has not been assigned."];
        }
        if (!secret) {
            return [false, "Missing required secret for existing room."];
        }
        if (roomInfo.host.secret != secret) {
            return [false, "Provided secret does not match."];
        }
        roomInfo.host.client = host;
        return [true, "Reconnection successful."];
    }
    public GetHost(roomId: string): PeerInfo | undefined {
        return this.roomInfo.get(roomId)?.host;
    }
    public RemoveHost(roomId: string | undefined, secret: string | undefined): [boolean, string] {
        if (!roomId) {
            return [false, "Missing required roomID field."];
        }
        const roomInfo = this.roomInfo.get(roomId);
        if (!roomInfo) {
            return [false, "Requested a room that has not been assigned."];
        }
        if (!secret) {
            return [false, "Missing required secret for existing room."];
        }
        if (roomInfo.host.secret != secret) {
            return [false, "Provided secret does not match."];
        }
        const success = this.roomInfo.delete(roomId);
        return [success, success ?
            `Removed host from room ID assignment "${roomId}".` :
            `Failed to remove host from room ID assignment "${roomId}".`];
    }
    public AddClient(client: WebSocketClient, roomId: string | undefined, name: string | undefined, secret: string): [boolean, string] {
        if (!roomId) {
            return [false, "Missing required roomID field."];
        }
        const roomInfo = this.roomInfo.get(roomId);
        if (!roomInfo) {
            return [false, "Requested a room that has not been assigned."];
        }
        if (!name) {
            return [false, "Missing required name field."];
        }
        const clientInfo: PeerInfo | undefined = roomInfo.clients.get(name);
        if (clientInfo) {
            return [false, "Requested a new connection to an existing client."];
        }
        roomInfo.clients.set(name, {
            secret: secret,
            client: client,
        })
        return [true, "Established a new client relay connection."];
    }
    public UpdateClient(client: WebSocketClient, roomId: string | undefined, name: string | undefined, secret: string | undefined): [boolean, string] {
        if (!roomId) {
            return [false, "Missing required roomID field."];
        }
        const roomInfo = this.roomInfo.get(roomId);
        if (!roomInfo) {
            return [false, "Requested a room that has not been assigned."];
        }
        if (!name) {
            return [false, "Missing required name field."];
        }
        const clientInfo: PeerInfo | undefined = roomInfo.clients.get(name);
        if (!clientInfo) {
            return [false, "Requested a client name that does not exist."];
        }
        if (!secret) {
            return [false, "Missing required secret field."];
        }
        if (clientInfo.secret != secret) {
            return [false, "Provided secret does not match."];
        }
        clientInfo.client = client;
        return [true, "Reconnection successful."];
    }
}

class RoomIDManager {
    private roomIds = new Array<string>()
    private characters: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private len: number = 4;
    constructor() {
        this.GenerateIDRecursive("");
    }
    private GenerateIDRecursive(substr: string): void {
        if (substr.length >= this.len) {
            this.roomIds.push(substr);
            return;
        }
        for (let i = 0; i < this.characters.length; i++) {
            const nextChar = this.characters[i];
            this.GenerateIDRecursive(substr + nextChar);
        }
    }
    public ClaimID(): string {
        const index: number = Math.floor(Math.random() * this.roomIds.length);
        const ret = this.roomIds[index];
        const lastElement = this.roomIds.pop();
        if (lastElement) {
            this.roomIds[index] = lastElement;
        } else {
            console.log("Ran out of room IDs. Generating more.")
            this.len++;
            this.GenerateIDRecursive("");
            return this.ClaimID();
        }
        return ret;
    }
    public ReturnID(id: string) {
        this.roomIds.push(id);
    }
}

const roomIdManager = new RoomIDManager();
const roomManager = new RoomManager();

// TODO: Stub. Fill this in.
// Used by the host to get client names. May be redundant.
function ResolveName(client: Peer.Instance): string {
    return "";
}

function HostConnect(handshake: Handshake, roomId: string | null, secret: string | null) {
    const json = {
        type: "Connect",
        fields: {
            role: Role.Host,
            roomId: roomId,
            secret: secret,
        },
    };
    handshake.send(JSON.stringify(json))
}
export function HandleHostConnect(host: WebSocketClient, jsonRec: any) {
    // No room ID provided. Give the host a new one.
    if (!jsonRec.fields.roomId) {
        const roomId = roomIdManager.ClaimID();
        randomBytes(48, function (err, buffer) {
            const secret = buffer.toString('hex');
            roomManager.AddHost(host, roomId, secret);
            const jsonSend = {
                type: "Connect",
                fields: {
                    role: Role.Server,
                    roomID: roomId,
                    secret: secret,
                    success: true,
                    msg: "Created a new room.",
                },
            };
            host.send(JSON.stringify(jsonSend));
            return;
        });
        return;
    }
    // Update the host upon reconnect.
    const [success, result] = roomManager.UpdateHost(host, jsonRec?.fields?.roomId, jsonRec?.fields?.secret);
    const jsonSend = {
        type: "Connect",
        fields: {
            role: Role.Server,
            success: success,
            msg: result,
        },
    };
    host.send(JSON.stringify(jsonSend));
    return;
}
function ClientConnect(handshake: Handshake, roomId: string, name: string | null, secret: string | null) {
    const json = {
        type: "Connect",
        fields: {
            role: Role.Client,
            roomId: roomId,
            name: name,
            secret: secret,
        },
    };
    handshake.send(JSON.stringify(json))
}
export function HandleClientConnect(client: WebSocketClient, jsonRec: any) {
    randomBytes(48, function (err, buffer) {
        const host: PeerInfo | undefined = roomManager.GetHost(jsonRec?.fields?.roomId);
        if (!host) {
            return;
        }
        const secret = buffer.toString('hex');
        const [success, result] = roomManager.AddClient(client, jsonRec?.fields?.roomId, jsonRec?.fields?.name, secret)
        const jsonSend = {
            type: "Connect",
            fields: {
                role: Role.Server,
                secret: success ? secret : undefined,
                success: success,
                msg: result,
            },
        };
        client.send(JSON.stringify(jsonSend));
        // TODO: Continue to relay this to the appropriate host.
        // TODO: Write the function that receives it on the host, which will add the client to WebRTCHost.peers.
        return;
    });
}
function HostShareSheet(client: Peer.Instance) {
    const json = {
        type: "ShareSheet",
        fields: {
            role: Role.Host,
            sheet: state.players.find(player => player.name === ResolveName(client)),
        },
    };
    client.send(JSON.stringify(json));
}
function HandleHostShareSheet(host: Peer.Instance, jsonRec: any) {
    // TODO: For now, we assume the server will always return a valid CharacterSheet.
    return jsonRec?.fields?.sheet as CharacterSheet;
}
function ClientShareAbility(host: Peer.Instance, ability: string, isStrength: boolean | undefined) {
    const json = {
        type: "ShareAbility",
        fields: {
            role: Role.Client,
            ability: ability,
            isStrength: isStrength,
        },
    };
    host.send(JSON.stringify(json));
}
async function HandleClientShareAbility(client: Peer.Instance, jsonRec: any) {
    const name: string = ResolveName(client);
    let sheet = state.players.find(player => player.name === name);
    if (!sheet) {
        console.log(`Unknown player "${name}" has no character sheet.`)
        return;
    }
    const ability = jsonRec?.fields?.ability;
    if (!ability) {
        console.log("No ability provided to HandleClientShareAbility()", jsonRec)
        return;
    }
    let isStrength: boolean | undefined = jsonRec?.fields?.isStrength;
    if (isStrength === undefined) {
        // Use AI to decide.
        isStrength = await IsStrength(sheet, ability);
    }
    if (isStrength) {
        sheet?.strengths.push(ability)
    } else {
        sheet?.weaknesses.push(ability)
    }
    // TODO: Is this redundant? Disable for now and see what happens.
    // state.players.set(name, sheet);
}
function HostUpdateState(client: Peer.Instance) {
    const json = {
        type: "UpdateState",
        fields: {
            role: Role.Host,
            gameState: state.gameState,
            round: state.round,
        },
    };
    client.send(JSON.stringify(json));
}
function HandleHostUpdateState(host: Peer.Instance, jsonRec: any) {
    return [jsonRec?.fields?.gameState, jsonRec?.fields?.round];
}
function ClientDisconnect(host: Peer.Instance) {
    const json = {
        type: "Disconnect",
        fields: {
            role: Role.Client,
        },
    };
    host.send(JSON.stringify(json));
}
function HandleClientDisconnect(client: Peer.Instance, jsonRec: any) {
    const name = ResolveName(client);
    // TODO: Remove the client from the list of players connected to the server, by adjusting WebRTCHost.peers.
}
function HostDisconnect(handshake: Handshake, roomId: string, secret: string) {
    const json = {
        type: "Disconnect",
        fields: {
            role: Role.Server,
            roomId: roomId,
            secret: secret,
        },
    };
    handshake.send(JSON.stringify(json));
}
export function HandleHostDisconnect(host: WebSocketClient, jsonRec: any): [boolean, string] {
    return roomManager.RemoveHost(jsonRec?.fields?.roomId, jsonRec?.fields?.secret);
}
function Heartbeat(host: Peer.Instance) {
    const json = { type: "Heartbeat" };
    host.send(JSON.stringify(json));
}