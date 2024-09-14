//
// Copyright (c) 2021 Steve Seguin. All Rights Reserved.
//  Use of this source code is governed by the APGLv3 open-source 
//  Use at your own risk, as it may contain bugs or security vulnerabilities
//
///// INSTALLATION
// sudo apt-get update
// sudo apt-get upgrade
// sudo apt-get install nodejs -y
// sudo apt-get install npm -y
// sudo npm install express
// sudo npm install ws
// sudo npm install fs
// sudo add-apt-repository ppa:certbot/certbot  
// sudo apt-get install certbot -y
// sudo certbot certonly // register your domain
// sudo nodejs server.js // port 443 needs to be open. THIS STARTS THE SERVER
//
//// Finally, if using this with a ninja deploy, update index.html of the ninja installation as needed, such as with:
//  session.wss = "wss://wss.contribute.cam:443";
//  session.customWSS = true;  #  Please refer to the vdo.ninja instructions for exact details on settings; this is just a demo.
/////////////////////////

"use strict";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
var https = require("https");
var http = require("http");
var express = require("express");
var app = express();
var WebSocket = require("ws");

// TODO: Re-enable SSL once other things are working, before a public deployment.
// const key = fs.readFileSync("/etc/letsencrypt/live/wss.contribute.cam/privkey.pem"); /// UPDATE THIS PATH
// const cert = fs.readFileSync("/etc/letsencrypt/live/wss.contribute.cam/fullchain.pem"); /// UPDATE THIS PATH

// var server = https.createServer({key,cert}, app);
var server = http.createServer(app);
var websocketServer = new WebSocket.Server({ server });

// TODO: Filter traffic on room ID. Only the first to connect, as a server, is permitted to "claim" this room ID. Each room ID is freed after an hour without receiving any traffic.
// TODO: Distinguish specific clients to get served with data based on their role as server or client.
websocketServer.on('connection', (webSocketClient) => {
    webSocketClient.on('message', (message) => {
        // TODO: Distinguish on room code and host/client identity.
        // TODO: Consider putting additional security precautions here too.
        websocketServer.clients.forEach(client => {
            if (webSocketClient != client) {
                client.send(message.toString());
            }
        });
    });
});
// const port = 443;
const port = 9080;
server.listen(port, () => { console.log(`Server started on port ${port}`) });
