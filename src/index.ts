import { WebSocketServer } from "ws";

import { SocketClient } from "./socket-client";

const clients: { [id: string]: SocketClient } = {};

const wss = new WebSocketServer({ port: Number(process.env.PORT) || 3000 });
wss.on("connection", (ws) => {
	const client = new SocketClient(ws);
	clients[client.id] = client;
	client.onDisconnect(() => delete clients[client.id]);
});
