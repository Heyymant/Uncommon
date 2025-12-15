import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateAIPrompts, isAIConfigured } from './aiPrompts.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files in production
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    aiEnabled: isAIConfigured(),
    provider: process.env.AI_PROVIDER || 'openai'
  });
});

app.get('/api/prompts', async (req, res) => {
  try {
    const category = req.query.category || 'mixed';
    const count = parseInt(req.query.count) || 5;
    
    console.log(`📝 Fetching ${count} prompts for category: ${category}`);
    const prompts = await generateAIPrompts(category, count);
    
    res.json({ 
      success: true, 
      prompts,
      aiGenerated: isAIConfigured(),
      category
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate prompts',
      prompts: [] 
    });
  }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Game state storage
const rooms = new Map();
const playerSockets = new Map(); // socketId -> { roomId, playerName }

// Available letters (excluding difficult ones)
const AVAILABLE_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWY'.split('');

// Game configuration
const DEFAULT_CONFIG = {
  rounds: 3,
  timeLimit: 60,
  promptsCount: 5
};

// Helper: Generate room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper: Get local IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Helper: Roll a new letter
function rollLetter(room) {
  const available = AVAILABLE_LETTERS.filter(l => !room.usedLetters.includes(l));
  if (available.length === 0) {
    room.usedLetters = [];
    return rollLetter(room);
  }
  const letter = available[Math.floor(Math.random() * available.length)];
  room.currentLetter = letter;
  room.usedLetters.push(letter);
  room.roundStartTime = Date.now();
  return letter;
}

// Helper: Calculate scores for current round
function calculateScores(room) {
  const submissions = Array.from(room.submissions.values());
  
  // Reset round scores
  room.players.forEach(player => {
    player.roundScore = 0;
  });

  // For each prompt, check submissions
  room.prompts.forEach((prompt, promptIndex) => {
    const wordsForPrompt = submissions.map(sub => ({
      playerId: sub.playerId,
      playerName: sub.playerName,
      word: (sub.words[promptIndex] || '').toLowerCase().trim()
    })).filter(w => {
      // Only valid words starting with the letter count
      const letter = room.currentLetter?.toLowerCase();
      return w.word && w.word.length > 0 && letter && w.word.startsWith(letter);
    });

    // Count occurrences
    const wordCounts = new Map();
    wordsForPrompt.forEach(({ word, playerId }) => {
      if (!wordCounts.has(word)) {
        wordCounts.set(word, []);
      }
      wordCounts.get(word).push(playerId);
    });

    // Award points: unique words get 1 point
    wordCounts.forEach((playerIds, word) => {
      if (playerIds.length === 1) {
        const player = room.players.find(p => p.id === playerIds[0]);
        if (player) {
          player.roundScore = (player.roundScore || 0) + 1;
          player.score = (player.score || 0) + 1;
        }
      }
    });
  });
  
  console.log(`📊 Scores for round ${room.currentRound}:`, 
    room.players.map(p => `${p.name}: +${p.roundScore} (Total: ${p.score})`).join(', '));
}

// Helper: Start voting phase
function startVotingPhase(room, roomId) {
  room.gameState = 'voting';
  room.votes = {};
  room.votingAnswers = [];
  
  const submissions = Array.from(room.submissions.values());
  const letter = room.currentLetter?.toLowerCase();
  
  // Collect all answers that need voting
  room.prompts.forEach((prompt, promptIndex) => {
    submissions.forEach(sub => {
      const word = (sub.words[promptIndex] || '').toLowerCase().trim();
      if (word && word.startsWith(letter)) {
        const answerId = `${sub.playerId}-${promptIndex}`;
        room.votingAnswers.push({
          id: answerId,
          playerId: sub.playerId,
          playerName: sub.playerName,
          promptIndex,
          prompt,
          word: sub.words[promptIndex], // Keep original case
          wordLower: word
        });
        // Initialize votes - auto-accept from the player who submitted
        room.votes[answerId] = { 
          accept: [sub.playerId], // Self-vote as accept
          reject: [] 
        };
      }
    });
  });
  
  io.to(roomId).emit('voting-started', {
    ...getRoomState(room),
    votingAnswers: room.votingAnswers,
    votes: room.votes
  });
  
  console.log(`🗳️ Voting started in room ${roomId} with ${room.votingAnswers.length} answers`);
}

// Helper: Finalize votes and calculate scores
function finalizeVotesAndScore(room) {
  const submissions = Array.from(room.submissions.values());
  const letter = room.currentLetter?.toLowerCase();
  const totalVoters = room.players.length;
  const majorityThreshold = Math.floor(totalVoters / 2) + 1;
  
  // Reset round scores
  room.players.forEach(player => {
    player.roundScore = 0;
  });
  
  // Track accepted words per prompt for duplicate detection
  const acceptedWordsPerPrompt = new Map();
  
  // First pass: determine which answers are accepted by majority
  room.prompts.forEach((prompt, promptIndex) => {
    acceptedWordsPerPrompt.set(promptIndex, []);
    
    submissions.forEach(sub => {
      const word = (sub.words[promptIndex] || '').toLowerCase().trim();
      if (!word || !word.startsWith(letter)) return;
      
      const answerId = `${sub.playerId}-${promptIndex}`;
      const voteData = room.votes[answerId] || { accept: [], reject: [] };
      
      // Check if majority accepted
      const acceptCount = voteData.accept.length;
      const rejectCount = voteData.reject.length;
      
      // Accept if: more accepts than rejects, OR no rejections and at least one accept
      const isAccepted = acceptCount > rejectCount || (rejectCount === 0 && acceptCount >= 1);
      
      if (isAccepted) {
        acceptedWordsPerPrompt.get(promptIndex).push({
          playerId: sub.playerId,
          word: word
        });
      }
      
      // Store vote result
      if (!room.voteResults) room.voteResults = {};
      room.voteResults[answerId] = {
        accepted: isAccepted,
        acceptCount,
        rejectCount,
        totalVoters
      };
    });
  });
  
  // Second pass: award points (unique accepted words only)
  room.prompts.forEach((prompt, promptIndex) => {
    const acceptedWords = acceptedWordsPerPrompt.get(promptIndex);
    
    // Count word occurrences
    const wordCounts = new Map();
    acceptedWords.forEach(({ word, playerId }) => {
      if (!wordCounts.has(word)) {
        wordCounts.set(word, []);
      }
      wordCounts.get(word).push(playerId);
    });
    
    // Award points for unique words
    wordCounts.forEach((playerIds, word) => {
      if (playerIds.length === 1) {
        const player = room.players.find(p => p.id === playerIds[0]);
        if (player) {
          player.roundScore = (player.roundScore || 0) + 1;
          player.score = (player.score || 0) + 1;
        }
      }
    });
  });
  
  console.log(`📊 Voting results for round ${room.currentRound}:`, 
    room.players.map(p => `${p.name}: +${p.roundScore} (Total: ${p.score})`).join(', '));
}

// Helper: Transfer host
function transferHost(room) {
  if (room.players.length > 0) {
    const newHost = room.players[0];
    room.hostId = newHost.id;
    console.log(`👑 Host transferred to ${newHost.name} in room ${room.id}`);
    return newHost;
  }
  return null;
}

// Helper: Get room state for client (converts Map to object)
function getRoomState(room) {
  return {
    ...room,
    submissions: Object.fromEntries(room.submissions),
    submittedPlayers: Array.from(room.submissions.keys()),
    votes: room.votes || {},
    votingAnswers: room.votingAnswers || [],
    voteResults: room.voteResults || {}
  };
}

// Helper: Reset room for new game (same players)
function resetRoomForNewGame(room) {
  room.gameState = 'lobby';
  room.prompts = [];
  room.currentRound = 0;
  room.currentLetter = null;
  room.usedLetters = [];
  room.roundStartTime = null;
  room.submissions = new Map();
  room.roundHistory = [];
  room.votes = {};
  room.votingAnswers = [];
  room.voteResults = {};
  room.players.forEach(player => {
    player.score = 0;
    player.roundScore = 0;
    player.submitted = false;
  });
}

io.on('connection', (socket) => {
  console.log('🔌 Player connected:', socket.id);

  // Create Room
  socket.on('create-room', (playerName) => {
    const roomId = generateRoomId();
    const player = { 
      id: socket.id, 
      name: playerName.trim(), 
      score: 0, 
      roundScore: 0,
      isConnected: true,
      submitted: false
    };
    
    const room = {
      id: roomId,
      players: [player],
      hostId: socket.id,
      gameState: 'lobby', // lobby, playing, review, finished
      prompts: [],
      currentRound: 0,
      currentLetter: null,
      usedLetters: [],
      roundStartTime: null,
      submissions: new Map(),
      roundHistory: [],
      gameConfig: { ...DEFAULT_CONFIG },
      createdAt: Date.now()
    };
    
    rooms.set(roomId, room);
    playerSockets.set(socket.id, { roomId, playerName: player.name });
    socket.join(roomId);
    
    socket.emit('room-created', roomId);
    io.to(roomId).emit('room-updated', getRoomState(room));
    console.log(`🏠 Room ${roomId} created by ${playerName}`);
  });

  // Join Room
  socket.on('join-room', ({ roomId, playerName }) => {
    const room = rooms.get(roomId?.toUpperCase());
    
    if (!room) {
      socket.emit('error', { type: 'room_not_found', message: 'Room not found. Check the Room ID.' });
      return;
    }
    
    if (room.gameState !== 'lobby') {
      socket.emit('error', { type: 'game_in_progress', message: 'Game already in progress. Wait for the next game.' });
      return;
    }
    
    const trimmedName = playerName.trim();
    if (room.players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      socket.emit('error', { type: 'name_taken', message: 'That name is already taken. Choose another.' });
      return;
    }
    
    if (trimmedName.length < 2) {
      socket.emit('error', { type: 'invalid_name', message: 'Name must be at least 2 characters.' });
      return;
    }
    
    if (room.players.length >= 10) {
      socket.emit('error', { type: 'room_full', message: 'Room is full (max 10 players).' });
      return;
    }
    
    const player = { 
      id: socket.id, 
      name: trimmedName, 
      score: 0, 
      roundScore: 0,
      isConnected: true,
      submitted: false
    };
    
    room.players.push(player);
    playerSockets.set(socket.id, { roomId: room.id, playerName: player.name });
    socket.join(room.id);
    
    io.to(room.id).emit('room-updated', getRoomState(room));
    io.to(room.id).emit('player-joined', { playerName: player.name, playerCount: room.players.length });
    console.log(`👋 ${playerName} joined room ${room.id} (${room.players.length} players)`);
  });

  // Fetch AI Prompts - Always generate fresh, real-time
  socket.on('fetch-ai-prompts', async ({ roomId, category, count, timestamp, replaceIndex }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', { type: 'room_not_found', message: 'Room not found.' });
      return;
    }
    
    if (socket.id !== room.hostId) {
      socket.emit('error', { type: 'not_host', message: 'Only the host can generate prompts.' });
      return;
    }

    try {
      // Always generate fresh prompts - no caching
      const requestCount = count || 5;
      const requestCategory = category || 'mixed';
      console.log(`🤖 Generating fresh AI prompts for room ${roomId}, category: ${requestCategory}, count: ${requestCount}, timestamp: ${timestamp}`);
      
      const prompts = await generateAIPrompts(requestCategory, requestCount);
      
      socket.emit('ai-prompts-generated', {
        success: true,
        prompts: Array.isArray(prompts) ? prompts : [prompts],
        aiGenerated: isAIConfigured(),
        category: requestCategory,
        timestamp: timestamp || Date.now(),
        replaceIndex: replaceIndex // Pass through if replacing single prompt
      });
      
      console.log(`✅ Fresh AI prompts sent to room ${roomId}:`, prompts);
    } catch (error) {
      console.error('Error generating AI prompts:', error);
      socket.emit('ai-prompts-generated', {
        success: false,
        prompts: [],
        error: 'Failed to generate prompts'
      });
    }
  });

  // Set Prompts
  socket.on('set-prompts', ({ roomId, prompts }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    if (socket.id !== room.hostId) {
      socket.emit('error', { type: 'not_host', message: 'Only the host can set prompts.' });
      return;
    }
    
    if (!prompts || prompts.length !== DEFAULT_CONFIG.promptsCount) {
      socket.emit('error', { type: 'invalid_prompts', message: `Please provide exactly ${DEFAULT_CONFIG.promptsCount} prompts.` });
      return;
    }
    
    room.prompts = prompts;
    io.to(roomId).emit('room-updated', getRoomState(room));
    console.log(`📝 Prompts set in room ${roomId}`);
  });

  // Start Game
  socket.on('start-game', (roomId) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { type: 'room_not_found', message: 'Room not found.' });
      return;
    }
    
    if (socket.id !== room.hostId) {
      socket.emit('error', { type: 'not_host', message: 'Only the host can start the game.' });
      return;
    }
    
    if (room.gameState !== 'lobby') {
      socket.emit('error', { type: 'already_started', message: 'Game has already started.' });
      return;
    }
    
    if (!room.prompts || room.prompts.length !== DEFAULT_CONFIG.promptsCount) {
      socket.emit('error', { type: 'no_prompts', message: 'Please set prompts first.' });
      return;
    }
    
    if (room.players.length === 0) {
      socket.emit('error', { type: 'no_players', message: 'No players in room.' });
      return;
    }
    
    // Initialize game
    room.gameState = 'playing';
    room.currentRound = 1;
    room.submissions = new Map();
    room.usedLetters = [];
    room.roundHistory = [];
    room.players.forEach(p => {
      p.score = 0;
      p.roundScore = 0;
      p.submitted = false;
    });
    
    rollLetter(room);
    
    io.to(roomId).emit('game-started', getRoomState(room));
    console.log(`🎮 Game started in room ${roomId} with ${room.players.length} player(s), letter: ${room.currentLetter}`);
  });

  // Submit Words
  socket.on('submit-words', ({ roomId, words }) => {
    const room = rooms.get(roomId);
    if (!room || room.gameState !== 'playing') return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    
    // Prevent double submission
    if (room.submissions.has(socket.id)) {
      console.log(`⚠️ ${player.name} tried to submit again`);
      return;
    }

    room.submissions.set(socket.id, {
      playerId: socket.id,
      playerName: player.name,
      words: words,
      submittedAt: Date.now()
    });
    
    player.submitted = true;
    
    const submittedCount = room.submissions.size;
    const totalPlayers = room.players.filter(p => p.isConnected).length;
    const allSubmitted = submittedCount >= totalPlayers;

    io.to(roomId).emit('submission-received', {
      playerName: player.name,
      playerId: player.id,
      submittedCount,
      totalPlayers,
      allSubmitted
    });
    
    console.log(`✍️ ${player.name} submitted (${submittedCount}/${totalPlayers})`);

    // If all submitted, move to voting phase
    if (allSubmitted) {
      setTimeout(() => {
        if (room.gameState === 'playing') {
          startVotingPhase(room, roomId);
        }
      }, 500);
    }
  });

  // Cast Vote
  socket.on('cast-vote', ({ roomId, answerId, vote }) => {
    const room = rooms.get(roomId);
    if (!room || room.gameState !== 'voting') return;
    
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    
    // answerId format: "playerId-promptIndex"
    if (!room.votes) room.votes = {};
    if (!room.votes[answerId]) room.votes[answerId] = { accept: [], reject: [] };
    
    // Remove previous vote if exists
    room.votes[answerId].accept = room.votes[answerId].accept.filter(id => id !== socket.id);
    room.votes[answerId].reject = room.votes[answerId].reject.filter(id => id !== socket.id);
    
    // Add new vote
    if (vote === 'accept') {
      room.votes[answerId].accept.push(socket.id);
    } else if (vote === 'reject') {
      room.votes[answerId].reject.push(socket.id);
    }
    
    // Broadcast vote update
    io.to(roomId).emit('vote-updated', {
      answerId,
      votes: room.votes[answerId],
      voterId: socket.id,
      voterName: player.name
    });
    
    console.log(`🗳️ ${player.name} voted ${vote} for ${answerId}`);
  });

  // Complete Voting (host only)
  socket.on('complete-voting', (roomId) => {
    const room = rooms.get(roomId);
    if (!room || room.gameState !== 'voting') return;
    
    if (socket.id !== room.hostId) {
      socket.emit('error', { type: 'not_host', message: 'Only the host can complete voting.' });
      return;
    }
    
    // Finalize votes and calculate scores
    finalizeVotesAndScore(room);
    
    // Move to review
    room.gameState = 'review';
    
    // Save round history
    room.roundHistory.push({
      round: room.currentRound,
      letter: room.currentLetter,
      submissions: Object.fromEntries(room.submissions),
      votes: room.votes,
      scores: room.players.map(p => ({ name: p.name, roundScore: p.roundScore, totalScore: p.score }))
    });
    
    io.to(roomId).emit('voting-complete', getRoomState(room));
    io.to(roomId).emit('round-review', getRoomState(room));
    console.log(`📋 Voting complete, Round ${room.currentRound} review in room ${roomId}`);
  });

  // Complete Review / Next Round
  socket.on('complete-review', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    if (socket.id !== room.hostId) {
      socket.emit('error', { type: 'not_host', message: 'Only the host can proceed.' });
      return;
    }
    
    if (room.gameState !== 'review') {
      return;
    }
    
    if (room.currentRound >= room.gameConfig.rounds) {
      // Game finished
      room.gameState = 'finished';
      io.to(roomId).emit('game-finished', getRoomState(room));
      console.log(`🏁 Game finished in room ${roomId}`);
    } else {
      // Next round
      room.currentRound++;
      room.submissions = new Map();
      room.players.forEach(p => {
        p.submitted = false;
        p.roundScore = 0;
      });
      rollLetter(room);
      room.gameState = 'playing';
      
      io.to(roomId).emit('next-round', getRoomState(room));
      console.log(`🔄 Round ${room.currentRound} started in room ${roomId}, letter: ${room.currentLetter}`);
    }
  });

  // Play Again (same room, new game)
  socket.on('play-again', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    if (socket.id !== room.hostId) {
      socket.emit('error', { type: 'not_host', message: 'Only the host can start a new game.' });
      return;
    }
    
    resetRoomForNewGame(room);
    io.to(roomId).emit('new-game', getRoomState(room));
    console.log(`🔄 New game started in room ${roomId}`);
  });

  // Leave Room
  socket.on('leave-room', () => {
    handlePlayerLeave(socket);
  });

  // Kick Player (host only)
  socket.on('kick-player', ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    if (socket.id !== room.hostId) {
      socket.emit('error', { type: 'not_host', message: 'Only the host can kick players.' });
      return;
    }
    
    if (playerId === room.hostId) {
      socket.emit('error', { type: 'cannot_kick', message: 'Cannot kick yourself.' });
      return;
    }
    
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      const kicked = room.players[playerIndex];
      room.players.splice(playerIndex, 1);
      room.submissions.delete(playerId);
      
      io.to(playerId).emit('kicked', { message: 'You have been removed from the room.' });
      io.sockets.sockets.get(playerId)?.leave(roomId);
      playerSockets.delete(playerId);
      
      io.to(roomId).emit('room-updated', getRoomState(room));
      io.to(roomId).emit('player-left', { playerName: kicked.name, reason: 'kicked' });
      console.log(`👢 ${kicked.name} kicked from room ${roomId}`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    handlePlayerLeave(socket);
    console.log('🔌 Player disconnected:', socket.id);
  });

  function handlePlayerLeave(socket) {
    const playerData = playerSockets.get(socket.id);
    if (!playerData) return;
    
    const { roomId, playerName } = playerData;
    const room = rooms.get(roomId);
    if (!room) return;
    
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    
    const wasHost = socket.id === room.hostId;
    room.players.splice(playerIndex, 1);
    room.submissions.delete(socket.id);
    playerSockets.delete(socket.id);
    
    if (room.players.length === 0) {
      // Room empty, delete it
      rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted (empty)`);
      return;
    }
    
    // Transfer host if needed
    if (wasHost) {
      const newHost = transferHost(room);
      if (newHost) {
        io.to(roomId).emit('host-changed', { newHostId: newHost.id, newHostName: newHost.name });
      }
    }
    
    io.to(roomId).emit('room-updated', getRoomState(room));
    io.to(roomId).emit('player-left', { playerName, reason: 'disconnected' });
    
    // If game is in progress and waiting for submissions, check if all remaining submitted
    if (room.gameState === 'playing') {
      const connectedPlayers = room.players.filter(p => p.isConnected);
      const allSubmitted = connectedPlayers.every(p => room.submissions.has(p.id));
      
      if (allSubmitted && connectedPlayers.length > 0) {
        room.gameState = 'review';
        calculateScores(room);
        io.to(roomId).emit('round-review', getRoomState(room));
      }
    }
  }
});

// Timer check for round expiration
setInterval(() => {
  for (const [roomId, room] of rooms.entries()) {
    if (room.gameState === 'playing' && room.roundStartTime) {
      const elapsed = (Date.now() - room.roundStartTime) / 1000;
      const timeLimit = room.gameConfig.timeLimit;
      
      if (elapsed >= timeLimit) {
        // Time's up - move to voting
        startVotingPhase(room, roomId);
        console.log(`⏰ Time expired for room ${roomId}, moving to voting`);
      }
    }
  }
}, 1000);

// Cleanup inactive rooms (older than 2 hours)
setInterval(() => {
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  for (const [roomId, room] of rooms.entries()) {
    if (room.createdAt < twoHoursAgo && room.players.length === 0) {
      rooms.delete(roomId);
      console.log(`🧹 Cleaned up inactive room ${roomId}`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

// Catch-all route for SPA in production
if (isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           🎮 UNCOMMON Game Server Started 🎮              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📍 Server running on:`);
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://${localIP}:${PORT}\n`);
  console.log(`📱 For mobile devices on the same WiFi:`);
  console.log(`   Open: http://${localIP}:3000 in your mobile browser\n`);
  console.log(`✨ Ready for players to connect!\n`);
});
