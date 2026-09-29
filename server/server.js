/**
 * letsDraw97 — Multiplayer Socket.io + Firebase Backend Server
 *
 * Features:
 *   - Private rooms (join only via Room ID)
 *   - Live cursor broadcasting
 *   - Real-time shape sync (add / update / delete / clear)
 *   - Firebase Realtime DB for persistent shape storage
 *   - Auto-cleanup when all users leave a room
 */

const express       = require('express');
const http          = require('http');
const { Server }    = require('socket.io');
const admin         = require('firebase-admin');
const path          = require('path');

// ── Firebase Admin SDK Setup ────────────────────────────────────
// Place your Firebase service account key JSON file at:
//   server/serviceAccountKey.json
// Download it from: Firebase Console → Project Settings → Service Accounts
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
let db = null;

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  db = admin.database();
  console.log('✅ Firebase Admin SDK connected');
} catch (err) {
  console.warn('⚠️  Firebase service account not found — running without DB persistence.');
  console.warn('   Place serviceAccountKey.json in the server/ directory to enable persistence.');
}

// ── Express + Socket.io Setup ───────────────────────────────────
const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://letsdraw97.web.app',
      'https://letsdraw97.firebaseapp.com',
    ],
    methods: ['GET', 'POST'],
  },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// In-memory room state (fast, ephemeral)
// Structure: { [roomId]: { peers: { [socketId]: { userId, name } }, shapes: [...] } }
const rooms = {};

function getRoom(roomId) {
  if (!rooms[roomId]) rooms[roomId] = { peers: {}, shapes: [] };
  return rooms[roomId];
}

// ── Load shapes from Firebase on room creation ───────────────────
async function loadShapesFromDB(roomId) {
  if (!db) return [];
  try {
    const snap = await db.ref(`rooms/${roomId}/shapes`).once('value');
    const data = snap.val();
    return data ? Object.values(data) : [];
  } catch (e) {
    console.error('DB load error:', e.message);
    return [];
  }
}

// ── Save shapes to Firebase ──────────────────────────────────────
async function saveShapesToDB(roomId, shapes) {
  if (!db) return;
  try {
    const shapesObj = {};
    shapes.forEach(s => { shapesObj[s.id] = s; });
    await db.ref(`rooms/${roomId}/shapes`).set(shapesObj);
  } catch (e) {
    console.error('DB save error:', e.message);
  }
}

// ── Socket.io Connection Handler ─────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  let currentRoomId = null;
  let currentUserId = null;

  // ── CHECK IF ROOM EXISTS (before joining) ──────────────────────
  socket.on('check-room', async ({ roomId }) => {
    if (!roomId) {
      socket.emit('room-check-result', { exists: false });
      return;
    }

    // 1. Active in memory?
    const activeRoom = rooms[roomId];
    if (activeRoom && Object.keys(activeRoom.peers).length > 0) {
      socket.emit('room-check-result', { exists: true });
      return;
    }

    // 2. Persisted in Firebase?
    if (db) {
      try {
        const snap = await db.ref(`rooms/${roomId}/createdAt`).once('value');
        socket.emit('room-check-result', { exists: snap.exists() });
        return;
      } catch (e) {
        console.error('check-room DB error:', e.message);
      }
    }

    // No DB configured: allow join only if room is active in memory
    socket.emit('room-check-result', { exists: !!activeRoom });
  });

  // ── JOIN ROOM ──────────────────────────────────────────────────
  socket.on('join-room', async ({ roomId, userId, name }) => {
    if (!roomId || !userId) return;

    currentRoomId = roomId;
    currentUserId = userId;

    socket.join(roomId);
    const room = getRoom(roomId);

    // Load from Firebase if room is fresh (no in-memory state yet)
    if (room.shapes.length === 0 && db) {
      room.shapes = await loadShapesFromDB(roomId);
    }

    // Mark room as created in Firebase (idempotent — only writes if not set)
    if (db) {
      db.ref(`rooms/${roomId}/createdAt`).transaction(current => {
        if (current === null) return Date.now(); // Only set if not already set
        return; // Abort transaction — already set
      }).catch(e => console.error('createdAt write error:', e.message));
    }

    // Register peer
    room.peers[socket.id] = { userId, name };

    // Send full room state to the new joiner
    const existingPeers = {};
    Object.entries(room.peers).forEach(([sid, peer]) => {
      if (sid !== socket.id) existingPeers[peer.userId] = { name: peer.name };
    });

    socket.emit('room-init', {
      shapes: room.shapes,
      peers: existingPeers,
    });

    // Notify existing peers about new joiner
    socket.to(roomId).emit('peer-joined', { userId, name });

    console.log(`👤 ${name} (${userId}) joined room: ${roomId} — ${Object.keys(room.peers).length} users online`);
  });

  // ── CURSOR MOVE ────────────────────────────────────────────────
  socket.on('cursor-move', ({ roomId, userId, name, x, y }) => {
    socket.to(roomId).emit('peer-cursor-move', { userId, name, x, y });
  });

  // ── SHAPE ADDED ────────────────────────────────────────────────
  socket.on('shape-added', ({ roomId, shape }) => {
    const room = getRoom(roomId);
    room.shapes.push(shape);
    socket.to(roomId).emit('peer-shape-added', { shape });
    saveShapesToDB(roomId, room.shapes); // persist async
  });

  // ── SHAPE UPDATED (move / resize / rotate) ─────────────────────
  socket.on('shape-updated', ({ roomId, shape }) => {
    const room = getRoom(roomId);
    const idx = room.shapes.findIndex(s => s.id === shape.id);
    if (idx !== -1) room.shapes[idx] = shape;
    socket.to(roomId).emit('peer-shape-updated', { shape });
    saveShapesToDB(roomId, room.shapes);
  });

  // ── SHAPE DELETED ──────────────────────────────────────────────
  socket.on('shape-deleted', ({ roomId, shapeId }) => {
    const room = getRoom(roomId);
    room.shapes = room.shapes.filter(s => s.id !== shapeId);
    socket.to(roomId).emit('peer-shape-deleted', { shapeId });
    saveShapesToDB(roomId, room.shapes);
  });

  // ── CANVAS FULL SYNC (undo / redo / erase) ────────────────────
  // Replaces the entire room shape list with the provided snapshot.
  socket.on('canvas-full-sync', ({ roomId, shapes }) => {
    const room = getRoom(roomId);
    if (Array.isArray(shapes)) {
      room.shapes = shapes;
      socket.to(roomId).emit('peer-canvas-full-sync', { shapes });
      saveShapesToDB(roomId, room.shapes);
    }
  });

  // ── SHAPES REORDERED (z-index change) ──────────────────────────
  socket.on('shapes-reordered', ({ roomId, shapes }) => {
    const room = getRoom(roomId);
    if (Array.isArray(shapes)) {
      room.shapes = shapes;
      socket.to(roomId).emit('peer-shapes-reordered', { shapes });
      saveShapesToDB(roomId, room.shapes);
    }
  });

  // ── CANVAS CLEARED ─────────────────────────────────────────────
  socket.on('canvas-cleared', ({ roomId }) => {
    const room = getRoom(roomId);
    room.shapes = [];
    socket.to(roomId).emit('peer-canvas-cleared');
    if (db) db.ref(`rooms/${roomId}/shapes`).remove();
  });

  // ── DISCONNECT ─────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const room = rooms[currentRoomId];
    if (!room) return;

    const peer = room.peers[socket.id];
    delete room.peers[socket.id];

    if (peer) {
      io.to(currentRoomId).emit('peer-left', { userId: currentUserId });
      console.log(`👋 ${peer.name} left room: ${currentRoomId} — ${Object.keys(room.peers).length} users remaining`);
    }

    // Clean up empty rooms from memory (Firebase data persists)
    if (Object.keys(room.peers).length === 0) {
      delete rooms[currentRoomId];
      console.log(`🗑 Room ${currentRoomId} cleaned from memory (data persists in Firebase)`);
    }
  });
});

// ── Health Check Endpoint ────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', rooms: Object.keys(rooms).length, time: new Date().toISOString() });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log(`\n🚀 letsDraw97 Socket.io server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
