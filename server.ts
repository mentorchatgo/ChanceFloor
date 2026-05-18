import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3000;
const TILE_COLORS = ['red', 'blue', 'green', 'yellow'];

app.use(express.json());

// Global game state for "Public Server"
let publicGameState = {
  round: 1,
  countdownDuration: 5,
  countdown: 5,
  targetColor: 'red',
  phase: 'countdown',
};

// Start global game loop
let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  if (publicGameState.phase === 'countdown') {
    publicGameState.countdown -= delta;
    if (publicGameState.countdown <= 0) {
      publicGameState.phase = 'active';
      publicGameState.countdown = 3; // 3 seconds to stay on tile
      broadcastPublicState();
    }
  } else if (publicGameState.phase === 'active') {
    publicGameState.countdown -= delta;
    if (publicGameState.countdown <= 0) {
      // End active phase -> calculate next round
      publicGameState.round += 1;
      publicGameState.countdownDuration = Math.max(1.0, publicGameState.countdownDuration - 0.1);
      publicGameState.countdown = publicGameState.countdownDuration;
      publicGameState.targetColor = TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)];
      publicGameState.phase = 'countdown';
      broadcastPublicState();
    }
  }
}, 100);

// Sockets
interface ConnectedUser {
  ws: WebSocket;
  userId?: string;
  displayName?: string;
  roomType: 'public' | 'private' | 'menu';
  roomId?: string; // For private rooms
}

const connections = new Map<string, ConnectedUser>();
const onlineUsers = new Set<string>(); // set of userIds currently online

// Private rooms
interface PrivateRoom {
  id: string;
  host: string;
  players: string[]; // connectionIds
  gameState: {
    round: number;
    countdownDuration: number;
    countdown: number;
    targetColor: string;
    phase: string;
  };
}
const privateRooms = new Map<string, PrivateRoom>();

function broadcastPublicState() {
  const message = JSON.stringify({
    type: 'publicState',
    state: publicGameState
  });
  connections.forEach((conn) => {
    if (conn.roomType === 'public' && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(message);
    }
  });
}

function broadcastOnlineUsers() {
  const message = JSON.stringify({
    type: 'onlineUsers',
    users: Array.from(onlineUsers)
  });
  connections.forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(message);
    }
  });
}

async function startServer() {
  let server;
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    const connId = uuidv4();
    connections.set(connId, { ws, roomType: 'menu' });

    ws.on('message', (messageAsString) => {
      try {
        const message = JSON.parse(messageAsString.toString());
        const conn = connections.get(connId)!;

        if (message.type === 'auth') {
          conn.userId = message.userId;
          conn.displayName = message.displayName;
          if (message.userId) {
            onlineUsers.add(message.userId);
            broadcastOnlineUsers();
          }
        } else if (message.type === 'joinPublic') {
          conn.roomType = 'public';
          // Send current state
          ws.send(JSON.stringify({ type: 'publicState', state: publicGameState }));
        } else if (message.type === 'createPrivate') {
          conn.roomType = 'private';
          const roomId = uuidv4();
          conn.roomId = roomId;
          privateRooms.set(roomId, {
            id: roomId,
            host: connId,
            players: [connId],
            gameState: {
              round: 1,
              countdownDuration: 5,
              countdown: 5,
              targetColor: TILE_COLORS[Math.floor(Math.random() * TILE_COLORS.length)],
              phase: 'waiting' // Need host to start
            }
          });
          ws.send(JSON.stringify({ type: 'privateCreated', roomId }));
        } else if (message.type === 'joinPrivate') {
          const room = privateRooms.get(message.roomId);
          if (room) {
            conn.roomType = 'private';
            conn.roomId = message.roomId;
            room.players.push(connId);
            ws.send(JSON.stringify({ type: 'privateJoined', roomId: message.roomId, state: room.gameState }));
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
          }
        } else if (message.type === 'invite') {
          // send invite to target user
          const targetUserId = message.targetUserId;
          connections.forEach((c) => {
            if (c.userId === targetUserId && c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(JSON.stringify({ 
                type: 'inviteReceived', 
                fromDisplay: conn.displayName,
                roomId: message.roomId 
              }));
            }
          });
        } else if (message.type === 'playerUpdate') {
          const msg = JSON.stringify({
            type: 'playerUpdate',
            userId: conn.userId,
            displayName: conn.displayName,
            position: message.position,
            color: message.color
          });
          connections.forEach(c => {
            if (c.roomType === conn.roomType && c.roomId === conn.roomId && c !== conn && c.ws.readyState === WebSocket.OPEN) {
              c.ws.send(msg);
            }
          });
        } else if (message.type === 'privateStateUpdate') {
          const room = privateRooms.get(conn.roomId!);
          if (room && room.host === connId) {
             room.gameState = message.state;
             const msg = JSON.stringify({
               type: 'privateStateUpdate',
               state: room.gameState
             });
             connections.forEach(c => {
               if (c.roomType === 'private' && c.roomId === conn.roomId && c !== conn && c.ws.readyState === WebSocket.OPEN) {
                 c.ws.send(msg);
               }
             });
          }
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    });

    ws.on('close', () => {
      const conn = connections.get(connId);
      if (conn?.userId) {
        // check if user has other connections
        let hasOther = false;
        connections.forEach((c, id) => {
          if (id !== connId && c.userId === conn.userId) hasOther = true;
        });
        if (!hasOther) {
          onlineUsers.delete(conn.userId);
          broadcastOnlineUsers();
        }
      }
      connections.delete(connId);
    });
  });
}

startServer();
