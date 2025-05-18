import { sendResponse } from 'utils';
import { Ship, Board } from '../types';
import { games, players } from '../db';

export function addShips(data: { gameId: string; indexPlayer: number; ships: Ship[] }) {
  const { gameId, ships, indexPlayer } = data;
  let game = games.get(gameId);

  if (!game) return;

  game.boards[indexPlayer] = { ships, shots: new Set() };

  if (game.boards.filter((board) => !!board).length === 2) {
    game.players.forEach((p, index) => {
      sendResponse(p.ws, {
        type: 'start_game',
        data: {
          ships: game.boards[index].ships,
          currentPlayerIndex: game.currentPlayerIndex,
        },
        id: 0,
      });
      sendResponse(p.ws, { type: 'turn', data: { currentPlayer: game.currentPlayerIndex }, id: 0 });
    });
  }
}

function processShot(
  board: Board,
  x: number,
  y: number,
): { status: 'miss' | 'shot' | 'killed'; ship?: Ship } {
  const cellKey = `${x},${y}`;

  if (board.shots.has(cellKey)) {
    console.log('Cell already shot:', cellKey);
    return { status: 'miss' };
  }

  board.shots.add(cellKey);

  for (const ship of board.ships) {
    const cells: { x: number; y: number }[] = [];
    const { x: sx, y: sy } = ship.position;

    for (let i = 0; i < ship.length; i++) {
      const cx = ship.direction ? sx : sx + i;
      const cy = ship.direction ? sy + i : sy;
      cells.push({ x: cx, y: cy });
    }

    if (cells.some((cell) => cell.x === x && cell.y === y)) {
      const allHit = cells.every((cell) => board.shots.has(`${cell.x},${cell.y}`));
      return allHit ? { status: 'killed', ship } : { status: 'shot' };
    }
  }

  return { status: 'miss' };
}

function getSurroundingCells(ship: Ship): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  const { x: sx, y: sy } = ship.position;

  const shipCells: { x: number; y: number }[] = [];
  for (let i = 0; i < ship.length; i++) {
    const cx = ship.direction ? sx : sx + i;
    const cy = ship.direction ? sy + i : sy;
    shipCells.push({ x: cx, y: cy });
  }

  for (const { x, y } of shipCells) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < 10 &&
          ny >= 0 &&
          ny < 10 &&
          !shipCells.some((c) => c.x === nx && c.y === ny)
        ) {
          cells.push({ x: nx, y: ny });
        }
      }
    }
  }

  return cells;
}

function isGameOver(board: Board): boolean {
  return board.ships.every((ship) => {
    const cells: { x: number; y: number }[] = [];
    const { x: sx, y: sy } = ship.position;
    for (let i = 0; i < ship.length; i++) {
      const cx = ship.direction ? sx : sx + i;
      const cy = ship.direction ? sy + i : sy;
      cells.push({ x: cx, y: cy });
    }
    return cells.every((cell) => board.shots.has(`${cell.x},${cell.y}`));
  });
}

export function updateWinners() {
  const winners = Array.from(players.values()).map(({ name, wins }) => ({ name, wins }));
  players.forEach((player) => {
    sendResponse(player.ws, {
      type: 'update_winners',
      data: winners,
      id: 0,
    });
  });
}

export function handleAttack(data: { gameId: string; indexPlayer: number; x: number; y: number }) {
  const { gameId, indexPlayer, x, y } = data;
  const game = games.get(gameId);

  if (!game || game.currentPlayerIndex !== indexPlayer) {
    console.log('Invalid attack: game or turn');
    return;
  }

  const opponentIndex = indexPlayer === 0 ? 1 : 0;
  const opponentBoard = game.boards[opponentIndex];

  if (!opponentBoard) {
    console.log('Opponent board not found');
    return;
  }

  const result = processShot(opponentBoard, x, y);

  game.players.forEach((p) => {
    sendResponse(p.ws, {
      type: 'attack',
      data: {
        position: { x, y },
        currentPlayer: indexPlayer,
        status: result.status,
      },
      id: 0,
    });
  });

  if (result.status === 'killed' && result.ship) {
    const surrounding = getSurroundingCells(result.ship);

    surrounding.forEach(({ x: sx, y: sy }) => {
      if (!opponentBoard.shots.has(`${sx},${sy}`)) {
        opponentBoard.shots.add(`${sx},${sy}`);

        game.players.forEach((p) => {
          sendResponse(p.ws, {
            type: 'attack',
            data: {
              position: { x: sx, y: sy },
              currentPlayer: indexPlayer,
              status: 'miss',
            },
            id: 0,
          });
        });
      }
    });
  }

  game.currentPlayerIndex = result.status === 'miss' ? opponentIndex : indexPlayer;
  game.players.forEach((p) => {
    sendResponse(p.ws, {
      type: 'turn',
      data: { currentPlayer: game.currentPlayerIndex },
      id: 0,
    });
  });

  if (isGameOver(opponentBoard)) {
    game.players.forEach((p) => {
      sendResponse(p.ws, {
        type: 'finish',
        data: { winPlayer: indexPlayer },
        id: 0,
      });
    });

    const winner = game.players[indexPlayer];

    players.get(winner.name)!.wins += 1;
    updateWinners();
    games.delete(gameId);
  }
}

export function handleRandomAttack(data: { gameId: string; indexPlayer: number }) {
  const { gameId, indexPlayer } = data;
  const game = games.get(gameId);

  if (!game || game.currentPlayerIndex !== indexPlayer) {
    console.log('Invalid random attack: game or turn');
    return;
  }

  const opponentIndex = indexPlayer === 0 ? 1 : 0;
  const opponentBoard = game.boards[opponentIndex];

  if (!opponentBoard) {
    console.log('Opponent board not found');
    return;
  }

  const availableCells: { x: number; y: number }[] = [];

  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      if (!opponentBoard.shots.has(`${x},${y}`)) {
        availableCells.push({ x, y });
      }
    }
  }

  if (availableCells.length === 0) return;

  const { x, y } = availableCells[Math.floor(Math.random() * availableCells.length)];
  handleAttack({ gameId, indexPlayer, x, y });
}
