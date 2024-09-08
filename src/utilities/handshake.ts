// TODO: Non-functional, but once it is, it will work for our purposes.
// Could benefit from some room code logic to limit broadcasts, as well as a way for a server to claim ownership (some sort of authentication?).
// Based on: https://github.com/steveseguin/websocket_server/blob/main/server.js
// Requires some work to ake it more idiomatic with Astro.

import * as https from 'https';
import * as express from 'express';
import * as WebSocket from 'ws';

interface ServerConfig {
  key: string;
  cert: string;
}

class WSServer {
  private app: express.Application;
  private server: https.Server;
  private wss: WebSocket.Server;

  constructor() {
    this.app = express();
    this.server = https.createServer({
      key: fs.readFileSync('/etc/letsencrypt/live/wss.contribute.cam/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/wss.contribute.cam/fullchain.pem')
    } as https.ServerOptions, this.app);
    this.wss = new WebSocket.Server({ server: this.server });
  }

  public start(): void {
    this.server.listen(443, () => console.log('Server started on port 443'));
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (webSocketClient: WebSocket.WebSocket) => {
      webSocketClient.on('message', (message: Buffer) => {
        const messageString = message.toString();
        this.wss.clients.forEach((client: WebSocket.WebSocket) => {
          if (client !== webSocketClient && client.readyState === WebSocket.OPEN) {
            client.send(messageString);
          }
        });
      });
    });
  }
}

// Initialize and start the server
new WSServer().start();
