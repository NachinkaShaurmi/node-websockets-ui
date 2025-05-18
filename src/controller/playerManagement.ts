import { WebSocket } from 'ws';
import { sendResponse } from '../utils';
import { players } from '../db';
import { Player } from '../types';

export function registerPlayer(
  ws: WebSocket,
  data: { name: string; password: string },
  wsId: string,
) {
  const { name, password } = data;

  if (players.has(name)) {
    const player = players.get(name)!;

    if (player.password === password) {
      player.ws = ws;
      player.wsId = wsId;

      sendResponse(ws, {
        type: 'reg',
        data: { name, index: player.index, error: false, errorText: '' },
        id: 0,
      });
      updateWinners(players);
    } else {
      sendResponse(ws, {
        type: 'reg',
        data: { name, index: '', error: true, errorText: 'Invalid password' },
        id: 0,
      });
    }
  } else {
    const index = crypto.randomUUID();
    const player: Player = { ws, name, index, password, wins: 0, wsId };

    players.set(name, player);

    sendResponse(ws, {
      type: 'reg',
      data: { name, index, error: false, errorText: '' },
      id: 0,
    });
    updateWinners(players);
  }
}

function updateWinners(players: Map<string, Player>) {
  const winners = Array.from(players.values()).map(({ name, wins }) => ({ name, wins }));
  players.forEach((player) => {
    sendResponse(player.ws, {
      type: 'update_winners',
      data: winners,
      id: 0,
    });
  });
}
