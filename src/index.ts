import { WebSocketServer } from 'ws';
import { httpServer } from './http_server';
import { exec } from 'child_process';
import wsController from './controller';

const HTTP_PORT = 8181;
const PORT = 3000;

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  console.log('Client connected');

  const wsId = crypto.randomUUID();

  ws.on('message', (message: string) => {
    try {
      wsController(ws, message, wsId);
    } catch (error) {
      console.error('Invalid message:', error);
    }
  });

  ws.on('error', console.error);

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

wss.on('listening', () => {
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`Static http server running on http://localhost:${HTTP_PORT}`);

  if (process.env.npm_lifecycle_event === 'start') {
    try {
      const start =
        process.platform === 'win32'
          ? 'start'
          : process.platform === 'darwin'
            ? 'open'
            : 'xdg-open';

      exec(`${start} http://localhost:${HTTP_PORT}`);
    } catch (error) {
      console.error('Error opening browser:', error);
    }
  }
});
