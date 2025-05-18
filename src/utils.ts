import { WebSocket } from 'ws';

interface IPayload {
  type: string;
  data: unknown;
  id: number;
}

export function sendResponse(ws: WebSocket, payload: IPayload) {
  ws.send?.(JSON.stringify({ ...payload, data: JSON.stringify(payload.data) }));
  console.log('Sent:', payload);
}
