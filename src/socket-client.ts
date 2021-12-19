import WebSocket from "ws";

import { ClientError } from "./client-error";
import { ID_SYMBOLS } from "./constants";
import { handlers } from "./handlers";
import { Json } from "./types";
import { randomString } from "./utils";

export class SocketClient {
  public readonly id: string;

  private readonly disconnectHandlers = new Set<() => any>();

  constructor(private readonly ws: WebSocket) {
    this.id = randomString(ID_SYMBOLS, 16);
    this.log("connected");
    this.ws.on("close", () => {
      this.log("disconnected");
      for (const handler of this.disconnectHandlers) handler();
    });
    this.ws.on("message", (data) => {
      if (Array.isArray(data)) data = Buffer.concat(data);
      const raw = data.toString();
      let json: Json;
      try {
        json = JSON.parse(raw);
      } catch (_) {
        return;
      }
      if (typeof json !== "object" || !json || Array.isArray(json)) return;
      const { id, method, args } = json;
      if (typeof id !== "number") return;
      try {
        if (typeof method !== "string") throw new ClientError("method is not a string");
        const handler = handlers[method];
        if (!handler) throw new ClientError("method not found");
        const result = handler(this, args);
        if (method !== "ping") this.log(`.${method}(${JSON.stringify(args)}) => ${JSON.stringify(result)}`);
        ws.send(JSON.stringify({ type: "success", id, request: json, result }));
      } catch (error) {
        if (!(error instanceof ClientError)) throw error;
        const reason = error.data;
        this.log(`.${method}(${JSON.stringify(args)}) exception: ${JSON.stringify(reason)}`);
        ws.send(JSON.stringify({ type: "error", id, request: json, reason }));
      }
    });
  }

  public log(str: string): void { console.log(`[${new Date().toISOString()}] ${this.id} ${str}`); }
  public onDisconnect(handler: () => any) { this.disconnectHandlers.add(handler); }

  public emit(event: string, data: Json): void {
    this.log(`:${event} (${JSON.stringify(data)})`);
    this.ws.send(JSON.stringify({ type: "event", event, data }));
  }
}
