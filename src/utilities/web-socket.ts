import { state } from "@utilities/state";

export class Handshake {
    private socket: WebSocket | null = null;
    private handleOpen: () => void;
    private handleMessage: (event: MessageEvent<string>) => void;
    private handleClose: (event: CloseEvent) => void;
    private handleError: (error: Event) => void;

    constructor() {
        this.handleOpen = () => {
            console.log('Connected to the WebSocket server');
        };

        this.handleMessage = (event: MessageEvent<string>) => {
            console.log(`Received message from server: ${event.data}`);
        };

        this.handleClose = (event: CloseEvent) => {
            console.log(`Disconnected from WebSocket server. Code: ${event.code}, Reason: ${event.reason}`);
        };

        this.handleError = (error: Event) => {
            console.error('WebSocket error:', error);
        };
    }

    public connect(): void {
        if (!this.socket) {
            // TODO: Make this customizable, as needed, to allow self-hosting.
            // TODO: Add support to negotiate on room codes.
            this.socket = new WebSocket('ws://localhost:9080');
            this.setupSocketEvents();
        }
    }

    private setupSocketEvents(): void {
        this.socket!.onopen = this.handleOpen;
        this.socket!.onmessage = this.handleMessage;
        this.socket!.onclose = this.handleClose;
        this.socket!.onerror = this.handleError;
    }

    // Used to change the handler from the default.
    public setHandleMessage(newHandler: (event: MessageEvent<string>) => void): void {
        this.handleMessage = newHandler;
    }

    // TODO: We can use this to communicate with the WebSocket server and "claim" a room code for our use.
    // TODO: Every peer should provide their "roomID" and identify as a "host" or "client", for routing purposes, even if it's only to handshake for WebRTC.
    // TODO: To handle reconnects, a secret should be provided by the server to re-authenticate a client.
    public send(msg: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(msg);
        }
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}
