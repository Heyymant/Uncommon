import { useState } from 'react';
import { LogoStandout, IconWifi, IconChevronDown, IconChevronUp, IconPlay, IconUsers, IconMoon, IconSun } from './Icons';
import './Lobby.css';

function Lobby({ onCreateRoom, onJoinRoom }) {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState('create');
  const [showRules, setShowRules] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedName = playerName.trim();
    
    if (!trimmedName) {
      alert('Please enter your name');
      return;
    }
    
    if (trimmedName.length < 2) {
      alert('Name must be at least 2 characters');
      return;
    }
    
    if (mode === 'create') {
      onCreateRoom(trimmedName);
    } else {
      const trimmedRoomId = roomId.trim();
      if (!trimmedRoomId) {
        alert('Please enter a room ID');
        return;
      }
      if (trimmedRoomId.length !== 6) {
        alert('Room ID should be 6 characters');
        return;
      }
      onJoinRoom(trimmedName, trimmedRoomId);
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-container">
        {/* Header */}
        <div className="lobby-header">
          <div className="game-logo">
            <LogoStandout size={48} />
            <h1>STANDOUT</h1>
          </div>
          <p className="game-tagline">Be unique. Win the round.</p>
        </div>

        {/* Main Card */}
        <div className="lobby-card">
          {/* Mode Toggle */}
          <div className="mode-toggle">
            <button
              className={mode === 'create' ? 'active' : ''}
              onClick={() => setMode('create')}
            >
              Create Room
            </button>
            <button
              className={mode === 'join' ? 'active' : ''}
              onClick={() => setMode('join')}
            >
              Join Room
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="lobby-form">
            <div className="form-group">
              <label htmlFor="playerName">Your Name</label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={15}
                autoComplete="off"
              />
            </div>

            {mode === 'join' && (
              <div className="form-group">
                <label htmlFor="roomId">Room Code</label>
                <input
                  id="roomId"
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  autoComplete="off"
                  className="room-code-input"
                />
              </div>
            )}

            <button type="submit" className="submit-btn">
              {mode === 'create' ? (
                <>
                  <IconPlay size={18} />
                  Create Room
                </>
              ) : (
                <>
                  <IconUsers size={18} />
                  Join Room
                </>
              )}
            </button>
          </form>

          {/* Connection Info */}
          <div className="connection-info">
            <IconWifi size={20} className="info-icon" />
            <div className="info-text">
              <strong>Playing with friends?</strong>
              <span>Everyone connects to: <code>{window.location.origin}</code></span>
            </div>
          </div>
        </div>

        {/* How to Play */}
        <div className="rules-section">
          <button 
            className="rules-toggle"
            onClick={() => setShowRules(!showRules)}
          >
            How to Play
            {showRules ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </button>

          {showRules && (
            <div className="rules-content">
              <div className="rule-item">
                <span className="rule-number">1</span>
                <div className="rule-text">
                  <strong>Get 5 Prompts</strong>
                  <p>Categories like "A country", "A movie", "A food item"</p>
                </div>
              </div>
              <div className="rule-item">
                <span className="rule-number">2</span>
                <div className="rule-text">
                  <strong>Roll a Letter</strong>
                  <p>A random letter is chosen for each round</p>
                </div>
              </div>
              <div className="rule-item">
                <span className="rule-number">3</span>
                <div className="rule-text">
                  <strong>Write Words</strong>
                  <p>60 seconds to answer all prompts with that letter</p>
                </div>
              </div>
              <div className="rule-item">
                <span className="rule-number">4</span>
                <div className="rule-text">
                  <strong>Stand Out!</strong>
                  <p><span className="highlight">Unique answer = 1 point</span>, Same as others = 0</p>
                </div>
              </div>
              <div className="rule-item">
                <span className="rule-number">5</span>
                <div className="rule-text">
                  <strong>3 Rounds</strong>
                  <p>Same prompts, different letter. Top score wins!</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="lobby-footer">
          <span>Same WiFi network</span>
          <span className="dot"></span>
          <span>Mobile & desktop</span>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
