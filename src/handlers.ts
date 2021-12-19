import { ClientError } from "./client-error";
import { DIRECTIONS } from "./constants";
import { Game, games } from "./game";
import { SocketClient } from "./socket-client";
import { Json } from "./types";

export const handlers: { [method: string]: (socket: SocketClient, args: Json) => Json } = {
  create_game: (socket) => {
    const game = new Game(socket);
    socket.onDisconnect(() => game.destroy());
    return { game_id: game.id, module_key: game.moduleKey };
  },
  connect_to_game: (socket, args) => {
    if (typeof args !== "object" || !args) throw new ClientError("arg is not an object");
    const { game_id: gameId } = args as any;
    if (typeof gameId !== "string") throw new ClientError("game_id is not a string");
    const game = games[gameId];
    if (!game) throw new ClientError("game not found");
    const pass = game.createClient(socket);
    socket.onDisconnect(() => delete game.clients[pass]);
    return { pass };
  },
  connect_to_expert: (socket, args) => {
    if (typeof args !== "object" || !args) throw new ClientError("arg is not an object");
    const { game_id: gameId, expert_id: expertId } = args as any;
    if (typeof gameId !== "string") throw new ClientError("game_id is not a string");
    if (typeof expertId !== "string") throw new ClientError("expert_id is not a string");
    const game = games[gameId];
    if (!game) throw new ClientError("game not found");
    if (game.module !== socket) throw new ClientError("not allowed");
    const client = game.clients[expertId];
    if (!client) throw new ClientError("expert not found");
    if (game.expert === client) throw new ClientError("already connected");
    if (game.expert) game.expert.emit("kicked_by_module", { game_id: game.id });
    game.expert = client;
    client.emit("connected_to_game", {
      game_id: game.id,
      expert_id: expertId,
      module_maze: game.moduleMaze.jsonify(),
      expert_pos: game.expertPos,
      expert_finish: game.expertFinish,
      move: game.move,
    });
    return {
      module_maze: game.moduleMaze.jsonify(),
      module_pos: game.modulePos,
      module_finish: game.moduleFinish,
      expert_maze: game.expertMaze.jsonify(),
      expert_pos: game.expertPos,
      expert_finish: game.expertFinish,
      move: game.move,
    };
  },
  kick_expert: (socket, args) => {
    if (typeof args !== "object" || !args) throw new ClientError("arg is not an object");
    const { game_id: gameId } = args as any;
    if (typeof gameId !== "string") throw new ClientError("game_id is not a string");
    const game = games[gameId];
    if (!game) throw new ClientError("game not found");
    if (game.module !== socket) throw new ClientError("not allowed");
    if (game.expert === null) throw new ClientError("no expert connected");
    game.expert.emit("kicked_by_module", { game_id: gameId });
    game.expert = null;
    return true;
  },
  module_move: (socket, args) => {
    if (typeof args !== "object" || !args) throw new ClientError("arg is not an object");
    const { game_id: gameId, direction } = args as any;
    if (typeof gameId !== "string") throw new ClientError("game_id is not a string");
    const dir = DIRECTIONS[direction as keyof typeof DIRECTIONS];
    if (typeof dir !== "number") throw new ClientError("unknown direction");
    const game = games[gameId];
    if (!game) throw new ClientError("game not found");
    if (game.module !== socket) throw new ClientError("not allowed");
    if (game.move !== "module") throw new ClientError("not allowed to move");
    const success = game.makeAMove(true, dir);
    if (game.expert) game.expert.emit("module_moved", { game_id: game.id, move: game.move, strike: !success });
    if (!success) throw new ClientError({ message: "moved into wall", direction, move: game.move });
    return { move: game.move, new_pos: game.modulePos };
  },
  expert_move: (socket, args) => {
    if (typeof args !== "object" || !args) throw new ClientError("arg is not an object");
    const { game_id: gameId, direction } = args as any;
    if (typeof gameId !== "string") throw new ClientError("game_id is not a string");
    const dir = DIRECTIONS[direction as keyof typeof DIRECTIONS];
    if (typeof dir !== "number") throw new ClientError("unknown direction");
    const game = games[gameId];
    if (!game) throw new ClientError("game not found");
    if (game.expert !== socket) throw new ClientError("not allowed");
    if (game.move !== "expert") throw new ClientError("not allowed to move");
    const success = game.makeAMove(false, dir);
    game.module.emit("expert_moved", {
      game_id: game.id,
      move: game.move,
      strike: !success,
      direction,
      new_expert_pos: game.expertPos,
    });
    if (!success) throw new ClientError({ message: "moved into wall", move: game.move });
    return { move: game.move, new_pos: game.expertPos };
  },
  ping: () => true,
};
