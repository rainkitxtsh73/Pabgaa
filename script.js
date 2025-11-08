// Game variables
let board = [];
let currentPlayer = 'white';
let selectedSquare = null;
let gameMode = null;
let timerInterval;
let timeLeft = 600; // 10 minutes in seconds
let socket;
let roomId = null;
let chatLog = [];

// Piece Unicode symbols
const pieces = {
    'white': { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
    'black': { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
};

// Initialize board
function initBoard() {
    board = [
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    ];
    renderBoard();
}

// Render board
function renderBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            if (board[row][col]) {
                const piece = document.createElement('div');
                piece.className = 'piece';
                piece.textContent = board[row][col];
                piece.draggable = true;
                piece.addEventListener('dragstart', (e) => selectPiece(e, row, col));
                square.appendChild(piece);
            }
            square.addEventListener('drop', (e) => dropPiece(e, row, col));
            square.addEventListener('dragover', (e) => e.preventDefault());
            boardElement.appendChild(square);
        }
    }
}

// Select piece
function selectPiece(e, row, col) {
    if (getPieceColor(board[row][col]) !== currentPlayer) return;
    selectedSquare = { row, col };
}

// Drop piece (make move)
function dropPiece(e, row, col) {
    e.preventDefault();
    if (!selectedSquare) return;
    const { row: fromRow, col: fromCol } = selectedSquare;
    if (isValidMove(fromRow, fromCol, row, col)) {
        makeMove(fromRow, fromCol, row, col);
        if (gameMode === 'online') {
            socket.emit('move', { from: { row: fromRow, col: fromCol }, to: { row, col } });
        } else if (gameMode === 'offline-ai' && currentPlayer === 'black') {
            setTimeout(() => aiMove(), 500);
        }
        selectedSquare = null;
    }
}

// Basic move validation (simplified)
function isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;
    // Add full rules here (e.g., path blocking, piece-specific moves)
    // For brevity, allow any move if square is empty or enemy
    return board[toRow][toCol] === null || getPieceColor(piece) !== getPieceColor(board[toRow][toCol]);
}

function getPieceColor(piece) {
    return Object.values(pieces.white).includes(piece) ? 'white' : 'black';
}

// Make move
function makeMove(fromRow, fromCol, toRow, toCol) {
    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = null;
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    document.getElementById('status').textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s turn`;
    renderBoard();
    checkGameEnd();
}

// AI move (simple random for now; replace with minimax)
function aiMove() {
    const moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (getPieceColor(board[r][c]) === 'black') {
                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        if (isValidMove(r, c, tr, tc)) moves.push({ from: { r, c }, to: { tr, tc } });
                    }
                }
            }
        }
    }
    if (moves.length > 0) {
        const move = moves[Math.floor(Math.random() * moves.length)];
        makeMove(move.from.r, move.from.c, move.to.tr, move.to.tc);
    }
}

// Check for checkmate (simplified)
function checkGameEnd() {
    // Implement check/checkmate logic
    // For now, just check if king is captured
    let whiteKing = false, blackKing = false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === '♔') whiteKing = true;
            if (board[r][c] === '♚') blackKing = true;
        }
    }
    if (!whiteKing) alert('Black wins!');
    if (!blackKing) alert('White wins!');
}

// Timer
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        document.getElementById('timer').textContent = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert(`${currentPlayer} ran out of time!`);
        }
    }, 1000);
}

// Menu handlers
document.getElementById('offline-ai').addEventListener('click', () => startGame('offline-ai'));
document.getElementById('offline-human').addEventListener('click', () => startGame('offline-human'));
document.getElementById('online').addEventListener('click', () => startGame('online'));

function startGame(mode) {
    gameMode = mode;
    document.getElementById('menu').style.display = 'none';
    document.getElementById('game').style.display = 'flex';
    if (mode === 'online') {
        document.getElementById('chat').style.display = 'flex';
        document.getElementById('online-controls').style.display = 'block';
        socket = io('http://localhost:3000');
        socket.on('roomCreated', (data) => { roomId = data.roomId; alert(`Room created: ${roomId}`); });
        socket.on('joinedRoom', () => alert('Joined room!'));
        socket.on('updateBoard', (data) => { board = data.board; renderBoard(); });
        socket.on('newChat', (data) => { chatLog.push(data.message); updateChat(); });
    }
    initBoard();
    startTimer();
}

document.getElementById('create-room').addEventListener('click', () => socket.emit('createRoom'));
document.getElementById('join-room').addEventListener('click', () => {
    const id = document.getElementById('room-id').value;
    socket.emit('joinRoom', { roomId: id });
});
document.getElementById('send-chat').addEventListener('click', () => {
    const msg = document.getElementById('chat-input').value;
    socket.emit('chat', { message: msg });
    document.getElementById('chat-input').value = '';
});
document.getElementById('reset').addEventListener('click', () => location.reload());

function updateChat() {
    document.getElementById('chat-log').innerHTML = chatLog.map(msg => `<p>${msg}</p>`).join('');
           }
