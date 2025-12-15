import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import DarkModeToggle from './components/DarkModeToggle';
import './App.css';

// Auto-detect server URL based on environment
const getServerUrl = () => {
  // Check for explicit backend URL (for Vercel + separate backend)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  
  // Production: use same origin (if backend serves frontend)
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  
  // Development: use localhost backend
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  return `http://${hostname}:3001`;
};

const SERVER_URL = getServerUrl();

function App() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [gameState, setGameState] = useState('lobby');
  const [room, setRoom] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [notification, setNotification] = useState(null);

  // Show notification
  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  }, []);

  useEffect(() => {
    const newSocket = io(SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: 10, // More attempts during active gameplay
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      
      // If game is active, try to reconnect
      if (room && (room.gameState === 'playing' || room.gameState === 'voting')) {
        setConnectionStatus('disconnected');
        // Socket.io will automatically try to reconnect
        showNotification('Connection lost. Attempting to reconnect...', 'warning');
      } else {
        setConnectionStatus('disconnected');
      }
    });
    
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      if (room) {
        setConnectionStatus('connected');
        showNotification('Reconnected successfully!', 'success');
        // Rejoin the room if we were in one
        if (room.id && playerName) {
          newSocket.emit('join-room', { roomId: room.id, playerName: playerName });
        }
      }
    });
    
    newSocket.on('reconnect_error', (error) => {
      console.log('Reconnection error:', error);
      showNotification('Reconnection failed. Please refresh the page.', 'error');
    });
    
    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt', attemptNumber);
      if (room && (room.gameState === 'playing' || room.gameState === 'voting')) {
        showNotification(`Reconnecting... (Attempt ${attemptNumber})`, 'warning');
      }
    });

    newSocket.on('connect_error', () => {
      setConnectionStatus('error');
    });

    newSocket.on('room-created', (roomId) => {
      setIsHost(true);
      setGameState('lobby');
      showNotification(`Room ${roomId} created!`, 'success');
    });

    newSocket.on('room-updated', (roomData) => {
      setRoom(roomData);
    });

    newSocket.on('game-started', (roomData) => {
      setRoom(roomData);
      setGameState('playing');
      showNotification(`Game started! Letter: ${roomData.currentLetter}`, 'success');
    });

    newSocket.on('next-round', (roomData) => {
      setRoom(roomData);
      setGameState('playing');
      showNotification(`Round ${roomData.currentRound}! Letter: ${roomData.currentLetter}`, 'info');
    });

    newSocket.on('voting-started', (roomData) => {
      setRoom(roomData);
      setGameState('voting');
      showNotification('Time to vote on answers!', 'info');
    });

    newSocket.on('voting-complete', (roomData) => {
      setRoom(roomData);
    });

    newSocket.on('vote-updated', (voteData) => {
      setRoom(prev => prev ? {
        ...prev,
        votes: {
          ...prev.votes,
          [voteData.answerId]: voteData.votes
        }
      } : prev);
    });

    newSocket.on('round-review', (roomData) => {
      setRoom(roomData);
      setGameState('review');
    });

    newSocket.on('game-finished', (roomData) => {
      setRoom(roomData);
      setGameState('finished');
    });

    newSocket.on('new-game', (roomData) => {
      setRoom(roomData);
      setGameState('lobby');
      showNotification('New game! Select prompts to start.', 'info');
    });

    newSocket.on('player-joined', ({ playerName: name, playerCount }) => {
      showNotification(`${name} joined (${playerCount} players)`, 'info');
    });

    newSocket.on('player-left', ({ playerName: name, reason }) => {
      const msg = reason === 'kicked' ? `${name} was removed` : `${name} left`;
      showNotification(msg, 'warning');
    });

    newSocket.on('host-changed', ({ newHostId, newHostName }) => {
      if (newSocket.id === newHostId) {
        setIsHost(true);
        showNotification("You're now the host!", 'success');
      } else {
        showNotification(`${newHostName} is now the host`, 'info');
      }
    });

    newSocket.on('kicked', ({ message }) => {
      setRoom(null);
      setGameState('lobby');
      setIsHost(false);
      showNotification(message, 'error');
    });

    newSocket.on('error', (error) => {
      const message = typeof error === 'string' ? error : error.message;
      showNotification(message, 'error');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [showNotification]);

  const handleCreateRoom = (name) => {
    if (socket && name.trim()) {
      setPlayerName(name.trim());
      socket.emit('create-room', name.trim());
    }
  };

  const handleJoinRoom = (name, roomId) => {
    if (socket && name.trim() && roomId.trim()) {
      setPlayerName(name.trim());
      socket.emit('join-room', { roomId: roomId.trim().toUpperCase(), playerName: name.trim() });
    }
  };

  const handleLeaveRoom = () => {
    // Prevent leaving during active gameplay
    if (room && (room.gameState === 'playing' || room.gameState === 'voting')) {
      const confirmLeave = window.confirm(
        '⚠️ Game in progress!\n\nLeaving now will disconnect you from the game.\n\nAre you sure you want to leave?'
      );
      if (!confirmLeave) {
        return;
      }
    }
    
    if (socket) {
      socket.emit('leave-room');
      setRoom(null);
      setGameState('lobby');
      setIsHost(false);
    }
  };

  // Prevent browser tab/window close during active gameplay
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (room && (room.gameState === 'playing' || room.gameState === 'voting')) {
        e.preventDefault();
        e.returnValue = 'Game is in progress! Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [room]);

  // Connection status overlay
  if (connectionStatus === 'connecting') {
    return (
      <>
        <DarkModeToggle />
        <div className="app-loading">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Connecting...</h2>
            <p>Please wait</p>
          </div>
        </div>
      </>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <>
        <DarkModeToggle />
        <div className="app-loading error">
          <div className="loading-content">
            <h2>Connection Failed</h2>
            <p>Unable to connect to server</p>
            <p className="hint">Make sure the server is running.</p>
            <button onClick={() => window.location.reload()} className="retry-button">
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  if (connectionStatus === 'disconnected') {
    return (
      <>
        <DarkModeToggle />
        <div className="app-loading warning">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Reconnecting...</h2>
            <p>Connection lost</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="app">
      <DarkModeToggle />
      
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {gameState === 'lobby' && !room ? (
        <Lobby
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      ) : room ? (
        <GameBoard
          socket={socket}
          room={room}
          playerName={playerName}
          isHost={isHost}
          gameState={gameState}
          onLeaveRoom={handleLeaveRoom}
        />
      ) : (
        <div className="app-loading">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Loading...</h2>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
