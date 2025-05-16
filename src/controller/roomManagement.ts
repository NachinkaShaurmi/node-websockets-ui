import { WebSocket } from 'ws';
import { Player, Room } from '../types';
import { players, rooms } from '../db';
import { sendResponse } from '../utils';

export function createRoom(wsId: string) {
  const player = players.values().find((p) => p.wsId === wsId);

  if (!player) return;

  const roomId = crypto.randomUUID();
  const room: Room = { id: roomId, players: [player] };
  rooms.set(roomId, room);
  updateRooms(rooms, players);
}

export function addUserToRoom(data: { indexRoom: string }, wsId: string) {
  const player = players.values().find((p) => p.wsId === wsId);

  const { indexRoom } = data;
  if (!player || !rooms.has(indexRoom)) return;

  const room = rooms.get(indexRoom)!;

  if (room.players.length < 2) {
    room.players.push(player);
    room.gameId = crypto.randomUUID();

    room.players.forEach((p, index) => {
      sendResponse(p.ws, {
        type: 'create_game',
        data: { idGame: room.gameId, idPlayer: index },
        id: 0,
      });
    });

    if (room.players.length === 2) {
      rooms.delete(indexRoom);
    }
    updateRooms(rooms, players);
  }
}

export function updateRooms(rooms: Map<string, Room>, players: Map<string, Player>) {
  const roomData = Array.from(rooms.values()).map((room) => ({
    roomId: room.id,
    roomUsers: room.players.map(({ name, index }) => ({ name, index })),
  }));

  players.forEach((player) => {
    sendResponse(player.ws, {
      type: 'update_room',
      data: roomData,
      id: 0,
    });
  });
}
