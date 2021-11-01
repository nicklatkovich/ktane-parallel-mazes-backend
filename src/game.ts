import { ID_SYMBOLS, PASS_SYMBOLS } from "./constants";
import { DX, DY, Maze } from "./maze";
import { SocketClient } from "./socket-client";
import { Coord } from "./types";
import { randomString } from "./utils";

export const games: { [id: string]: Game } = {};
export const gameIdByModuleKey: { [key: string]: string } = {};

function eqCoords(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

export class Game {
  public module: SocketClient;
  public readonly id: string;
  public readonly moduleKey: string;
  public readonly clients: { [pass: string]: SocketClient } = {};
  public expert: SocketClient | null = null;
  public moduleMaze: Maze;
  public expertMaze: Maze;
  public modulePos: Coord;
  public expertPos: Coord;
  public moduleFinish: Coord;
  public expertFinish: Coord;
  public move: "module" | "expert" | "none";

  constructor(module: SocketClient) {
    this.module = module;
    this.id = randomString(ID_SYMBOLS, 6);
    this.moduleKey = module.id;
    games[this.id] = this;
    gameIdByModuleKey[this.moduleKey] = this.id;
    this.moduleMaze = new Maze();
    this.expertMaze = new Maze();
    [this.modulePos, this.moduleFinish] = this.moduleMaze.generatePoints();
    [this.expertPos, this.expertFinish] = this.expertMaze.generatePoints();
    const moduleLength = this.moduleMaze.findPath(this.modulePos, this.moduleFinish).length;
    const expertLength = this.expertMaze.findPath(this.expertPos, this.expertFinish).length;
    if (moduleLength > expertLength) this.move = "module";
    else if (expertLength > moduleLength) this.move = "expert";
    else this.move = Math.random() < 0.5 ? "module" : "expert";
  }

  public createClient(socket: SocketClient): string {
    const pass = randomString(PASS_SYMBOLS, 7);
    this.clients[pass] = socket;
    return pass;
  }

  public destroy(): void {
    delete games[this.id];
    delete gameIdByModuleKey[this.moduleKey];
  }

  public makeAMove(module: boolean, dir: number): boolean {
    if (module !== (this.move === "module")) return false;
    const from = module ? this.modulePos : this.expertPos;
    const maze = module ? this.moduleMaze : this.expertMaze;
    const success = (maze.jsonify()[from.x][from.y] & (1 << dir)) > 0;
    const to = { x: from.x + DX[dir], y: from.y + DY[dir] };
    if (module) {
      if (success) this.modulePos = to;
      if (!eqCoords(this.expertPos, this.expertFinish)) this.move = "expert";
      else if (!eqCoords(this.modulePos, this.moduleFinish)) this.move = "module";
      else this.move = "none";
    } else {
      if (success) this.expertPos = to;
      if (!eqCoords(this.modulePos, this.moduleFinish)) this.move = "module";
      else if (!eqCoords(this.expertPos, this.expertFinish)) this.move = "expert";
      else this.move = "none";
    }
    return success;
  }
}
