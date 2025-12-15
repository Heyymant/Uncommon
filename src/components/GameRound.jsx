import { useState, useEffect, useRef } from 'react';
import { CheckIcon, IconX, IconSend } from './Icons';
import './GameRound.css';

function GameRound({ socket, room, playerName, isHost }) {
  const [words, setWords] = useState(Array(5).fill(''));
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitted, setSubmitted] = useState(false);
  const [submittedPlayers, setSubmittedPlayers] = useState([]);
  const inputRefs = useRef([]);

  // Reset state when new round starts
  useEffect(() => {
    if (room && room.gameState === 'playing') {
      setWords(Array(5).fill(''));
      setSubmitted(false);
      setSubmittedPlayers(room.submittedPlayers || []);
    }
  }, [room?.currentRound, room?.currentLetter]);

  // Sync submitted players from room state
  useEffect(() => {
    if (room?.submittedPlayers) {
      setSubmittedPlayers(room.submittedPlayers);
    }
  }, [room?.submittedPlayers]);

  // Timer calculation and countdown
  useEffect(() => {
    if (!room || !room.roundStartTime || submitted) return;
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - room.roundStartTime) / 1000);
      const remaining = Math.max(0, (room.gameConfig?.timeLimit || 60) - elapsed);
      setTimeLeft(remaining);
      
      if (remaining === 0 && !submitted) {
        handleAutoSubmit();
      }
    };
    
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [room, submitted]);

  // Listen for submission updates
  useEffect(() => {
    const handleSubmission = ({ playerId, submittedCount, totalPlayers }) => {
      setSubmittedPlayers(prev => {
        if (!prev.includes(playerId)) {
          return [...prev, playerId];
        }
        return prev;
      });
    };

    socket.on('submission-received', handleSubmission);
    return () => socket.off('submission-received', handleSubmission);
  }, [socket]);

  const handleAutoSubmit = () => {
    if (submitted || !room) return;
    
    const letter = room.currentLetter?.toLowerCase();
    const normalized = words.map((w) => {
      const trimmed = w.trim().toLowerCase();
      if (!trimmed) return '';
      return trimmed.startsWith(letter || '') ? trimmed : '';
    });
    
    socket.emit('submit-words', { roomId: room.id, words: normalized });
    setSubmitted(true);
  };

  const handleWordChange = (index, value) => {
    const newWords = [...words];
    newWords[index] = value;
    setWords(newWords);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < 4) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleSubmit();
      }
    }
  };

  const handleSubmit = () => {
    if (submitted) return;
    if (!room || !room.currentLetter) return;

    const letter = room.currentLetter.toLowerCase();
    const errors = [];
    
    const normalized = words.map((w, i) => {
      const trimmed = w.trim().toLowerCase();
      if (!trimmed) return ''; // Empty is OK
      if (!trimmed.startsWith(letter)) {
        errors.push(i + 1);
        return '__invalid__';
      }
      return trimmed;
    });

    if (errors.length > 0) {
      alert(`Prompt ${errors.join(', ')}: Words must start with "${room.currentLetter.toUpperCase()}" (or leave empty)`);
      return;
    }

    // Check duplicates among non-empty valid words
    const validFilled = normalized.filter(w => w && w !== '__invalid__');
    const unique = new Set(validFilled);
    if (unique.size !== validFilled.length) {
      alert('You cannot repeat words!');
      return;
    }

    const finalWords = normalized.map(w => (w === '__invalid__' ? '' : w));
    socket.emit('submit-words', { roomId: room.id, words: finalWords });
    setSubmitted(true);
  };

  // Validation helper
  const getInputStatus = (index) => {
    const word = words[index]?.trim().toLowerCase();
    if (!word) return 'empty';
    if (!room?.currentLetter) return 'empty';
    if (!word.startsWith(room.currentLetter.toLowerCase())) return 'invalid';
    // Check for duplicates
    const otherWords = words.filter((w, i) => i !== index && w.trim().toLowerCase());
    if (otherWords.includes(word)) return 'duplicate';
    return 'valid';
  };

  if (!room || !room.currentLetter || !room.prompts) {
    return (
      <div className="game-round">
        <div className="round-loading">
          <div className="loading-spinner"></div>
          <p>Starting round...</p>
        </div>
      </div>
    );
  }

  // Submitted waiting screen
  if (submitted) {
    const totalPlayers = room.players.length;
    const submittedCount = submittedPlayers.length;
    const waitingFor = room.players.filter(p => !submittedPlayers.includes(p.id));

    return (
      <div className="game-round">
        <div className="submitted-screen">
          <div className="submitted-icon"><CheckIcon size={32} /></div>
          <h2>Answers Submitted!</h2>
          <p>Waiting for other players...</p>
          
          <div className="submission-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(submittedCount / totalPlayers) * 100}%` }}
              ></div>
            </div>
            <span className="progress-text">{submittedCount} / {totalPlayers} submitted</span>
          </div>

          {waitingFor.length > 0 && (
            <div className="waiting-for">
              <span>Waiting for: </span>
              {waitingFor.map(p => (
                <span key={p.id} className="waiting-player">{p.name}</span>
              ))}
            </div>
          )}

          <div className="submitted-words">
            <h4>Your Answers</h4>
            <div className="words-preview">
              {room.prompts.map((prompt, i) => (
                <div key={i} className="word-preview-item">
                  <span className="preview-prompt">{prompt}</span>
                  <span className={`preview-word ${words[i]?.trim() ? '' : 'empty'}`}>
                    {words[i]?.trim() || '(empty)'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active game round
  return (
    <div className="game-round">
      <div className="round-header">
        <div className="round-meta">
          <h2>Round {room.currentRound} of {room.gameConfig?.rounds || 3}</h2>
          <div className="used-letters">
            {room.usedLetters.map((l, i) => (
              <span key={i} className={`used-letter ${l === room.currentLetter ? 'current' : 'past'}`}>
                {l}
              </span>
            ))}
          </div>
        </div>
        
        <div className="letter-display">
          <div className="letter-box">
            <span className="letter">{room.currentLetter}</span>
          </div>
          <span className="letter-hint">Write words starting with this letter</span>
        </div>

        <div className={`timer ${timeLeft <= 10 ? 'warning' : ''} ${timeLeft <= 5 ? 'critical' : ''}`}>
          <svg className="timer-ring" viewBox="0 0 100 100">
            <circle
              className="timer-ring-bg"
              cx="50"
              cy="50"
              r="45"
            />
            <circle
              className="timer-ring-progress"
              cx="50"
              cy="50"
              r="45"
              strokeDasharray={`${(timeLeft / 60) * 283} 283`}
            />
          </svg>
          <span className="timer-value">{timeLeft}</span>
        </div>
      </div>

      <div className="prompts-section">
        {room.prompts.map((prompt, index) => {
          const status = getInputStatus(index);
          return (
            <div key={index} className={`prompt-row ${status}`}>
              <div className="prompt-label">
                <span className="prompt-number">{index + 1}</span>
                <span className="prompt-text">{prompt}</span>
              </div>
              <div className="input-wrapper">
                <input
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  value={words[index] || ''}
                  onChange={(e) => handleWordChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  placeholder={`${room.currentLetter}...`}
                  disabled={submitted}
                  className={`word-input ${status}`}
                  autoFocus={index === 0}
                  autoComplete="off"
                  autoCapitalize="off"
                />
                {status === 'valid' && <span className="input-status-icon valid"><CheckIcon size={16} /></span>}
                {status === 'invalid' && <span className="input-status-icon invalid"><IconX size={16} /></span>}
                {status === 'duplicate' && <span className="input-status-icon duplicate">!</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="round-footer">
        <div className="submission-status">
          <span className="status-count">
            {submittedPlayers.length} / {room.players.length} submitted
          </span>
          <div className="player-status-dots">
            {room.players.map(p => (
              <div 
                key={p.id} 
                className={`status-dot ${submittedPlayers.includes(p.id) ? 'submitted' : ''}`}
                title={p.name}
              />
            ))}
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={submitted}
          className="submit-button"
        >
          <IconSend size={16} />
          Submit
        </button>
      </div>
    </div>
  );
}

export default GameRound;
