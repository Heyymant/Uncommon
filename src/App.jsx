import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import DarkModeToggle from './components/DarkModeToggle';
import './App.css';

// Auto-detect server URL based on current hostname
const getServerUrl = () => {
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
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
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
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
    if (socket) {
      socket.emit('leave-room');
      setRoom(null);
      setGameState('lobby');
      setIsHost(false);
    }
  };

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
