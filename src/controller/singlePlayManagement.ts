import { players, rooms, games } from '../db';
import { createRoom, addUserToRoom } from './roomManagement';
import { WebSocket } from 'ws';
import { Ship, ShipType } from '../types';
import { registerPlayer } from './playerManagement';
import { addShips, handleRandomAttack } from './gameManagement';

export const BOT_NAME = 'Bot';

let botWsId: string | null = null;

export function handleSinglePlay(wsId: string) {
  const player = Array.from(players.values()).find((p) => p.wsId === wsId);
  if (!player) {
    console.log('Player not found for single play:', wsId);
    return;
  }

  createRoom(wsId);

  const botRoom = Array.from(rooms.values()).find((room) =>
    room.players.some((p) => p.wsId === wsId),
  );

  if (botRoom) joinBotToRoom(botRoom.id);
}

export function createBot(): string {
  if (botWsId) {
    return botWsId;
  }

  const botWs = {} as WebSocket;
  const wsId = crypto.randomUUID();
  const botData = { name: BOT_NAME, password: 'botpass' };

  registerPlayer(botWs, botData, wsId);
  botWsId = wsId;
  return wsId;
}

export function joinBotToRoom(indexRoom: string) {
  const wsId = createBot();
  const botPlayer = Array.from(players.values()).find((p) => p.name === BOT_NAME);

  if (!botPlayer) {
    console.log('Bot player not found after creation');
    return;
  }

  addUserToRoom({ indexRoom }, wsId);

  const game = Array.from(games.values()).find((g) => g.players.some((p) => p.name === BOT_NAME));

  if (game) {
    const ships = generateRandomShips();
    addShips({
      gameId: game.id,
      indexPlayer: game.players.findIndex((p) => p.name === BOT_NAME),
      ships,
    });
  }
}

export function botPlay(gameId: string, indexPlayer: number) {
  const game = games.get(gameId);
  if (!game || game.currentPlayerIndex !== indexPlayer) return;

  const botPlayer = game.players[indexPlayer];
  if (botPlayer.name === BOT_NAME) {
    handleRandomAttack({ gameId, indexPlayer });
  }
}

function generateRandomShips(): Ship[] {
  const ships: Ship[] = [];
  const types = [
    { type: 'huge', length: 4, count: 1 },
    { type: 'large', length: 3, count: 2 },
    { type: 'medium', length: 2, count: 3 },
    { type: 'small', length: 1, count: 4 },
  ];
  const occupiedCells = new Set<string>();
  const attemptsLimit = 100_000;

  for (const { type, length, count } of types) {
    for (let i = 0; i < count; i++) {
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < attemptsLimit) {
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);
        const direction = Math.random() > 0.5;
        const cells: { x: number; y: number }[] = [];
        let isValidPosition = true;

        for (let j = 0; j < length; j++) {
          const cx = direction ? x : x + j;
          const cy = direction ? y + j : y;
          if (cx >= 10 || cy >= 10 || occupiedCells.has(`${cx},${cy}`)) {
            isValidPosition = false;
            break;
          }
          cells.push({ x: cx, y: cy });
        }

        if (isValidPosition) {
          for (const { x: cx, y: cy } of cells) {
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10 && occupiedCells.has(`${nx},${ny}`)) {
                  isValidPosition = false;
                  break;
                }
              }
              if (!isValidPosition) break;
            }
            if (!isValidPosition) break;
          }
        }

        if (isValidPosition) {
          cells.forEach(({ x, y }) => occupiedCells.add(`${x},${y}`));
          ships.push({ position: { x, y }, direction, length, type: type as ShipType });
          valid = true;
        }
        attempts++;
      }

      if (!valid) {
        console.log(`Failed to place ${type} ship after ${attemptsLimit} attempts`);
        return [];
      }
    }
  }

  return ships;
}
