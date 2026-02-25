const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const RoomManager = require('./roomManager');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const roomManager = new RoomManager(io);

// Redis Adapter Setup
const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis adapter connected");
}).catch((err) => {
    console.error("Redis connection error:", err);
});

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('joinGame', () => {
        console.log(`Received joinGame from ${socket.id}`);
        roomManager.joinGame(socket);
    });

    socket.on('submitSequence', ({ roomId, sequence }) => {
        roomManager.submitSequence(socket, roomId, sequence);
    });

    socket.on('playerReady', ({ roomId }) => {
        roomManager.playerReady(socket, roomId);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        roomManager.handleDisconnect(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
