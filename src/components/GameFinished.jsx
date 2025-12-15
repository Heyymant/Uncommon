import { useState, useMemo } from 'react';
import { IconTrophy, IconRefresh, IconLogout, IconChevronDown, IconChevronUp, IconUsers } from './Icons';
import './GameFinished.css';

function GameFinished({ socket, room, playerName, isHost }) {
  const [showHistory, setShowHistory] = useState(false);

  const sortedPlayers = useMemo(() => {
    return [...room.players].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [room.players]);

  const winner = sortedPlayers[0];
  const isWinner = winner?.name === playerName;
  const isTie = sortedPlayers.filter(p => p.score === winner?.score).length > 1;

  const handlePlayAgain = () => {
    if (isHost) {
      socket.emit('play-again', room.id);
    }
  };

  const handleLeaveRoom = () => {
    window.location.reload();
  };

  // Get max possible score
  const maxPossibleScore = room.gameConfig.rounds * 5; // 3 rounds × 5 prompts

  return (
    <div className="game-finished">
      {/* Trophy Section */}
      <div className="trophy-section">
        {isWinner && !isTie ? (
          <>
            <div className="trophy-icon"><IconTrophy size={32} /></div>
            <h1>Victory!</h1>
            <p className="winner-subtitle">You won with {winner.score} points!</p>
          </>
        ) : isTie ? (
          <>
            <div className="trophy-icon"><IconUsers size={32} /></div>
            <h1>It's a Tie!</h1>
            <p className="winner-subtitle">
              {sortedPlayers.filter(p => p.score === winner?.score).map(p => p.name).join(' & ')} tied with {winner.score} points!
            </p>
          </>
        ) : (
          <>
            <div className="trophy-icon"><IconTrophy size={32} /></div>
            <h1>Game Over</h1>
            <p className="winner-subtitle">{winner?.name} wins with {winner?.score} points!</p>
          </>
        )}
      </div>

      {/* Final Leaderboard */}
      <div className="final-leaderboard">
        <h3>Final Standings</h3>
        <div className="leaderboard-list">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className={`leaderboard-row ${player.name === playerName ? 'you' : ''} ${index === 0 ? 'winner' : ''}`}
            >
              <div className="rank-badge">
                {index + 1}
              </div>
              <div className="player-details">
                <span className="player-name">
                  {player.name}
                  {player.name === playerName && <span className="you-tag">(You)</span>}
                </span>
              </div>
              <div className="score-section">
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${(player.score / maxPossibleScore) * 100}%` }}
                  ></div>
                </div>
                <span className="score-value">{player.score} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game Stats */}
      <div className="game-stats">
        <div className="stat-card">
          <span className="stat-value">{room.gameConfig.rounds}</span>
          <span className="stat-label">Rounds</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{room.players.length}</span>
          <span className="stat-label">Players</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{room.usedLetters.join(', ')}</span>
          <span className="stat-label">Letters Used</span>
        </div>
      </div>

      {/* Round History Toggle */}
      {room.roundHistory && room.roundHistory.length > 0 && (
        <div className="history-section">
          <button 
            className="history-toggle"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? (
              <>Round History <IconChevronUp size={16} /></>
            ) : (
              <>Round History <IconChevronDown size={16} /></>
            )}
          </button>

          {showHistory && (
            <div className="round-history">
              {room.roundHistory.map((round, i) => (
                <div key={i} className="history-round">
                  <div className="history-header">
                    <span>Round {round.round}</span>
                    <span className="history-letter">Letter: {round.letter}</span>
                  </div>
                  <div className="history-scores">
                    {round.scores.map((score, j) => (
                      <div key={j} className="history-score-item">
                        <span>{score.name}</span>
                        <span>+{score.roundScore}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        {isHost ? (
          <>
            <button onClick={handlePlayAgain} className="play-again-btn">
              <IconRefresh size={18} />
              New Game
            </button>
            <button onClick={handleLeaveRoom} className="leave-btn">
              <IconLogout size={16} />
              Leave Room
            </button>
          </>
        ) : (
          <>
            <p className="waiting-text">Waiting for host to start a new game...</p>
            <button onClick={handleLeaveRoom} className="leave-btn">
              <IconLogout size={16} />
              Leave Room
            </button>
          </>
        )}
      </div>

      {/* Room Info */}
      <div className="room-info">
        <span>Room: {room.id}</span>
        <span>•</span>
        <span>{room.players.length} players</span>
      </div>
    </div>
  );
}

export default GameFinished;
