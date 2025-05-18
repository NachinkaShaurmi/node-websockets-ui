import { WebSocket } from 'ws';

export interface Player {
  ws: WebSocket;
  name: string;
  index: string;
  password: string;
  wins: number;
  wsId: string;
}

export interface Room {
  id: string;
  players: Player[];
  gameId?: string;
}

export interface Ship {
  position: { x: number; y: number };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

export interface Board {
  ships: Ship[];
  shots: Set<string>;
}

export interface Game {
  id: string;
  players: Player[];
  boards: Board[];
  currentPlayerIndex: number;
}
