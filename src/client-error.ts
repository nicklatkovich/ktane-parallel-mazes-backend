import { Json } from "./types";

export class ClientError extends Error {
  constructor(public readonly data: Json) {
    super(JSON.stringify(data));
  }
}
