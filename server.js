const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let rooms = {};

io.on('connection', (socket) => {
    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substr(2, 9);
        rooms[roomId] = { players: [socket.id], board: initialBoard() };
        socket.join(roomId);
        socket.emit('roomCreated', { roomId });
    });

    socket.on('joinRoom', (data) => {
        const { roomId } = data;
        if (rooms[roomId] && rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            socket.emit('joinedRoom');
            io.to(roomId).emit('updateBoard', { board: rooms[roomId].board });
        }
    });

    socket.on('move', (data) => {
        const roomId = Object.keys(rooms).find(r => rooms[r].players.includes(socket.id));
        if (roomId) {
            // Update board logic here (similar to client)
            io.to(roomId).emit('updateBoard', { board: rooms[roomId].board });
        }
    });

    socket.on('chat', (data) => {
        const roomId = Object.keys(rooms).find(r => rooms[r].players.includes(socket.id));
        if (roomId) {
            io.to(roomId).emit('newChat', { message: data.message });
        }
    });
});

function initialBoard() {
    // Return initial board array
    return [
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    ];
}

server.listen(3000, () => console.log('Server running on port 3000'));
