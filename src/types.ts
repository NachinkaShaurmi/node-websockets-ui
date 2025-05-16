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
