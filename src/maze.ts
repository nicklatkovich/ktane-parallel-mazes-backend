import { Coord } from "./types";

export const DX = [1, 0, -1, 0];
export const DY = [0, -1, 0, 1];
export const WIDHT = 7;
export const HEIGHT = 7;

export class Maze {
  private _data: number[][];

  constructor() {
    this._data = new Array(WIDHT).fill(0).map(() => new Array(HEIGHT).fill(0));
    const states = new Array(WIDHT).fill(0).map(() => new Array(HEIGHT).fill(0));
    const startX = Math.floor(Math.random() * WIDHT);
    const startY = Math.floor(Math.random() * HEIGHT);
    states[startX][startY] = 2;
    const q: [number, number][] = [];
    for (let d = 0; d < 4; d++) {
      const xx = startX + DX[d];
      const yy = startY + DY[d];
      if (xx < 0 || xx >= WIDHT || yy < 0 || yy >= HEIGHT) continue;
      states[xx][yy] = 1;
      q.push([xx, yy]);
    }
    while (q.length > 0) {
      const i = Math.floor(Math.random() * q.length);
      const [sx, sy] = q[i];
      q[i] = q[q.length - 1];
      q.pop();
      states[sx][sy] = 2;
      const dirs = [];
      for (let d = 0; d < 4; d++) {
        const xx = sx + DX[d];
        const yy = sy + DY[d];
        if (xx < 0 || xx >= WIDHT || yy < 0 || yy >= HEIGHT) continue;
        if (states[xx][yy] === 2) dirs.push(d);
        else if (states[xx][yy] === 0) {
          states[xx][yy] = 1;
          q.push([xx, yy]);
        }
      }
      const d = dirs[Math.floor(Math.random() * dirs.length)];
      const xx = sx + DX[d];
      const yy = sy + DY[d];
      this._data[sx][sy] |= 1 << d;
      this._data[xx][yy] |= 1 << ((d + 2) % 4);
    }
  }

  public getLongestPathFinish(start: Coord): Coord {
    const usedCells = new Array(WIDHT).fill(0).map(() => new Array(HEIGHT).fill(false));
    usedCells[start.x][start.y] = true;
    let q = [start];
    let nextQ: Coord[] = [];
    let result = start;
    while (true) {
      const pos = q.pop()!;
      for (let d = 0; d < 4; d++) {
        const nextPos = { x: pos.x + DX[d], y: pos.y + DY[d] };
        if (nextPos.x < 0 || nextPos.x >= WIDHT || nextPos.y < 0 || nextPos.y >= HEIGHT) continue;
        if (usedCells[nextPos.x][nextPos.y] || (this._data[pos.x][pos.y] & (1 << d)) == 0) continue;
        usedCells[nextPos.x][nextPos.y] = true;
        nextQ.push(nextPos);
      }
      if (q.length === 0) {
        if (nextQ.length === 0) return result;
        result = nextQ[Math.floor(Math.random() * nextQ.length)];
        [nextQ, q] = [[], nextQ];
      }
    }
  }

  public generatePoints(): [Coord, Coord] {
    const randPos: Coord = { x: Math.floor(Math.random() * WIDHT), y: Math.floor(Math.random() * HEIGHT) };
    const start = this.getLongestPathFinish(randPos);
    const finish = this.getLongestPathFinish(start);
		let path = this.findPath(start, finish);
		if (path.length > 6) {
			const length = Math.floor(Math.random() * Math.min(5, path.length - 5)) + 6;
			const skip = Math.floor(Math.random() * (path.length - length + 1));
			path = path.slice(skip, skip + length);
		}
    return [path[0], path[path.length - 1]];
  }

	public findPath(from: Coord, to: Coord): Coord[] {
		const arrows = new Array(WIDHT).fill(0).map(() => new Array(HEIGHT).fill(-1));
		let q = [from];
		let nextQ: Coord[] = [];
		while (arrows[to.x][to.y] == -1) {
			const ind = Math.floor(Math.random() * q.length);
			const pos = q[ind];
			q[ind] = q[q.length - 1];
			q.pop();
			for (let d = 0; d < 4; d++) {
				const nextPos = { x: pos.x + DX[d], y: pos.y + DY[d] };
        if (nextPos.x < 0 || nextPos.x >= WIDHT || nextPos.y < 0 || nextPos.y >= HEIGHT) continue;
				if (arrows[nextPos.x][nextPos.y] !== -1 || (this._data[pos.x][pos.y] & (1 << d)) == 0) continue;
				arrows[nextPos.x][nextPos.y] = (d + 2) % 4;
				nextQ.push(nextPos);
			}
			if (q.length === 0) [nextQ, q] = [[], nextQ];
		}
		const result = [to];
		let pos = to;
		while (pos.x !== from.x || pos.y !== from.y) {
			const d = arrows[pos.x][pos.y];
			pos = { x: pos.x + DX[d], y: pos.y + DY[d] };
			result.push(pos);
		}
		return result.reverse();
	}

  public jsonify(): number[][] {
    return this._data;
  }
}
