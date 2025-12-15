import { useState, useEffect } from 'react';
import PromptSelection from './PromptSelection';
import GameRound from './GameRound';
import VotingRound from './VotingRound';
import ReviewRound from './ReviewRound';
import GameFinished from './GameFinished';
import { IconX, IconCrown, IconCopy, IconUsers } from './Icons';
import './GameBoard.css';

function GameBoard({ socket, room, playerName, isHost, gameState, onLeaveRoom }) {
  const [localRoom, setLocalRoom] = useState(room);

  useEffect(() => {
    if (room) {
      setLocalRoom(room);
    }
  }, [room]);

  if (!localRoom) {
    return (
      <div className="game-board">
        <div className="waiting-screen">
          <div className="loading-spinner"></div>
          <h2>Syncing...</h2>
          <p>Connecting to the game.</p>
        </div>
      </div>
    );
  }

  // Game Header Component
  const GameHeader = () => (
    <div className="game-header">
      <div className="header-left">
        <span className="room-badge">{localRoom.id}</span>
        <span className="player-count">
          <IconUsers size={14} />
          {localRoom.players.length}
        </span>
      </div>
      <div className="header-center">
        {(localRoom.gameState === 'playing' || localRoom.gameState === 'voting' || localRoom.gameState === 'review') && (
          <div className="round-progress">
            {[1, 2, 3].map(r => (
              <div 
                key={r} 
                className={`progress-dot ${r < localRoom.currentRound ? 'completed' : ''} ${r === localRoom.currentRound ? 'active' : ''}`}
              >
                {r}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="header-right">
        {isHost && (
          <span className="host-indicator">
            <IconCrown size={14} />
            Host
          </span>
        )}
        <button className="leave-btn" onClick={onLeaveRoom} title="Leave Room">
          <IconX size={18} />
        </button>
      </div>
    </div>
  );

  // Host Prompt Selection Screen
  if (isHost && localRoom.gameState === 'lobby' && localRoom.prompts.length === 0) {
    return (
      <div className="game-board">
        <GameHeader />
        <div className="connection-panel">
          <div className="connection-card">
            <h3>Invite Players</h3>
            <div className="connection-grid">
              <div className="connection-item">
                <label>Room Code</label>
                <div className="connection-value">
                  <code>{localRoom.id}</code>
                  <button 
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(localRoom.id)}
                  >
                    <IconCopy size={14} />
                  </button>
                </div>
              </div>
              <div className="connection-item">
                <label>Connect URL</label>
                <div className="connection-value">
                  <code className="url-code">{window.location.origin}</code>
                  <button 
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(window.location.origin)}
                  >
                    <IconCopy size={14} />
                  </button>
                </div>
              </div>
            </div>
            <p className="connection-tip">
              Share the URL and Room Code with players on the same network
            </p>
          </div>
        </div>
        <PromptSelection
          socket={socket}
          roomId={localRoom.id}
          room={localRoom}
          isHost={isHost}
        />
      </div>
    );
  }

  // Non-host Lobby Waiting Screen
  if (!isHost && localRoom.gameState === 'lobby') {
    return (
      <div className="game-board">
        <GameHeader />
        <div className="waiting-screen lobby-wait">
          <div className="waiting-content">
            <h2>Waiting for Host</h2>
            <p>The host is selecting prompts for this game.</p>
            
            <div className="game-info">
              <div className="info-item">
                <span className="info-label">Rounds</span>
                <span className="info-value">3</span>
              </div>
              <div className="info-item">
                <span className="info-label">Time</span>
                <span className="info-value">60s</span>
              </div>
              <div className="info-item">
                <span className="info-label">Prompts</span>
                <span className="info-value">5</span>
              </div>
            </div>

            <div className="players-panel">
              <h3>Players ({localRoom.players.length})</h3>
              <div className="players-grid">
                {localRoom.players.map(player => (
                  <div key={player.id} className={`player-card ${player.name === playerName ? 'you' : ''}`}>
                    <span className="player-name">{player.name}</span>
                    {player.id === localRoom.hostId && <span className="host-badge">Host</span>}
                    {player.name === playerName && <span className="you-badge">You</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="rules-summary">
              <h4>How to Play</h4>
              <ul>
                <li>Each round, a random letter is rolled</li>
                <li>Answer 5 prompts with words starting with that letter</li>
                <li>Unique answers = 1 point, Same as others = 0</li>
                <li>Highest score after 3 rounds wins!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Game Round
  if (gameState === 'playing' || localRoom.gameState === 'playing') {
    return (
      <div className="game-board">
        <GameHeader />
        <GameRound
          socket={socket}
          room={localRoom}
          playerName={playerName}
          isHost={isHost}
        />
      </div>
    );
  }

  // Voting Round
  if (gameState === 'voting' || localRoom.gameState === 'voting') {
    return (
      <div className="game-board">
        <GameHeader />
        <VotingRound
          socket={socket}
          room={localRoom}
          playerName={playerName}
          isHost={isHost}
        />
      </div>
    );
  }

  // Review Round
  if (gameState === 'review' || localRoom.gameState === 'review') {
    return (
      <div className="game-board">
        <GameHeader />
        <ReviewRound
          socket={socket}
          room={localRoom}
          playerName={playerName}
          isHost={isHost}
        />
      </div>
    );
  }

  // Game Finished
  if (gameState === 'finished' || localRoom.gameState === 'finished') {
    return (
      <div className="game-board">
        <GameHeader />
        <GameFinished
          socket={socket}
          room={localRoom}
          playerName={playerName}
          isHost={isHost}
        />
      </div>
    );
  }

  // Fallback
  return (
    <div className="game-board">
      <GameHeader />
      <div className="waiting-screen">
        <div className="loading-spinner"></div>
        <h2>Preparing...</h2>
        <p>Setting up the next phase.</p>
      </div>
    </div>
  );
}

export default GameBoard;
