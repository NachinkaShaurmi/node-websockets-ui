import { WebSocket } from 'ws';
import { registerPlayer } from './registerPlayer';
import { Player } from '../types';
import { createRoom, updateRooms, addUserToRoom } from './roomManagement';
import { players, rooms } from '../db';

interface IWsCommand {
  type: string;
  data: string;
  id: number;
}

export default function handleMessage(ws: WebSocket, message: string, wsId: string) {
  const data: IWsCommand = JSON.parse(message);
  console.log('Received:', data);

  const payload = JSON.parse(data.data || '{}');

  switch (data.type) {
    case 'reg':
      registerPlayer(ws, payload, wsId);
      updateRooms(rooms, players);
      break;

    case 'create_room':
      createRoom(wsId);
      break;

    case 'add_user_to_room':
      addUserToRoom(payload, wsId);
      break;

    default:
      console.log('Unknown command:', data.type);
  }
}
