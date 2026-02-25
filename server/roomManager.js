const { v4: uuidv4 } = require('uuid');

class RoomManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map(); // roomId -> roomData
        this.waitingPlayer = null; // Single player waiting for a match
    }

    joinGame(socket) {
        console.log(`Player joining game: ${socket.id}`);
        if (this.waitingPlayer && this.waitingPlayer.id !== socket.id) {
            const roomId = `room_${uuidv4()}`;
            const player1 = this.waitingPlayer;
            const player2 = socket;

            console.log(`Matching ${player1.id} with ${player2.id} in room ${roomId}`);

            const roomData = {
                id: roomId,
                players: [
                    { id: player1.id, score: 0, roundsWon: 0 },
                    { id: player2.id, score: 0, roundsWon: 0 }
                ],
                currentSequence: [],
                roundStartTime: 0,
                status: 'starting'
            };

            this.rooms.set(roomId, roomData);

            player1.join(roomId);
            player2.join(roomId);

            roomData.readyPlayers = new Set();

            this.waitingPlayer = null;

            console.log(`Emitting matchFound to room ${roomId}`);
            this.io.to(roomId).emit('matchFound', { roomId, players: roomData.players });
        } else {
            console.log(`Player ${socket.id} is now waiting for opponent`);
            this.waitingPlayer = socket;
            socket.emit('waitingForOpponent');
        }
    }

    playerReady(socket, roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        console.log(`Player ${socket.id} ready in room ${roomId}`);
        room.readyPlayers.add(socket.id);

        if (room.readyPlayers.size === 2 && room.status === 'starting') {
            console.log(`Both players ready in room ${roomId}. Starting round 1.`);
            this.startRound(roomId);
        }
    }

    startRound(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.currentSequence = this.generateSequence(5);
        room.roundStartTime = Date.now();
        room.status = 'playing';
        room.winnerDeclared = false;

        this.io.to(roomId).emit('roundStart', { 
            sequence: room.currentSequence,
            roundStartTime: room.roundStartTime
        });
    }

    generateSequence(length) {
        const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        const sequence = [];
        for (let i = 0; i < length; i++) {
            sequence.push(directions[Math.floor(Math.random() * directions.length)]);
        }
        return sequence;
    }

    submitSequence(socket, roomId, sequence) {
        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'playing' || room.winnerDeclared) return;

        const submissionTime = Date.now();
        const duration = submissionTime - room.roundStartTime;

        // Anti-Cheat: Minimum 400ms for human limit
        if (duration < 400) {
            console.warn(`Cheating attempt detected from ${socket.id} (duration: ${duration}ms)`);
            return;
        }

        // Validate sequence
        if (JSON.stringify(sequence) === JSON.stringify(room.currentSequence)) {
            room.winnerDeclared = true;
            room.status = 'roundEnded';

            const player = room.players.find(p => p.id === socket.id);
            player.score += 10;
            player.roundsWon += 1;

            this.io.to(roomId).emit('roundWin', { 
                winnerId: socket.id, 
                players: room.players 
            });

            // Check for match win (5 rounds or 50 points)
            if (player.roundsWon >= 5 || player.score >= 50) {
                this.io.to(roomId).emit('matchGameOver', { winnerId: socket.id });
                this.rooms.delete(roomId);
            } else {
                // Next round
                setTimeout(() => this.startRound(roomId), 2000);
            }
        } else {
            socket.emit('roundFail');
        }
    }

    handleDisconnect(socketId) {
        if (this.waitingPlayer && this.waitingPlayer.id === socketId) {
            this.waitingPlayer = null;
        }

        for (const [roomId, room] of this.rooms.entries()) {
            const playerIdx = room.players.findIndex(p => p.id === socketId);
            if (playerIdx !== -1) {
                this.io.to(roomId).emit('opponentDisconnected');
                this.rooms.delete(roomId);
                break;
            }
        }
    }
}

module.exports = RoomManager;
