import { useState, useMemo } from 'react';
import { CheckIcon, XIcon } from './Icons';
import './ReviewRound.css';

function ReviewRound({ socket, room, playerName, isHost }) {
  const [showAllAnswers, setShowAllAnswers] = useState(false);

  // Get submissions from room
  const submissions = useMemo(() => {
    if (!room.submissions) return [];
    return Object.values(room.submissions);
  }, [room.submissions]);

  const handleContinue = () => {
    if (isHost) {
      socket.emit('complete-review', room.id);
    }
  };

  // Analyze submissions by prompt
  const analysis = useMemo(() => {
    return room.prompts.map((prompt, promptIndex) => {
      const wordsForPrompt = submissions.map(sub => ({
        playerName: sub.playerName,
        playerId: sub.playerId,
        word: (sub.words[promptIndex] || '').toLowerCase().trim()
      })).filter(w => w.word);

      // Count occurrences
      const wordCounts = new Map();
      wordsForPrompt.forEach(({ word, playerName, playerId }) => {
        if (!wordCounts.has(word)) {
          wordCounts.set(word, []);
        }
        wordCounts.get(word).push({ playerName, playerId });
      });

      return {
        prompt,
        words: wordsForPrompt,
        wordCounts,
        totalAnswers: wordsForPrompt.length,
        uniqueCount: Array.from(wordCounts.values()).filter(arr => arr.length === 1).length,
        duplicateCount: Array.from(wordCounts.values()).filter(arr => arr.length > 1).length
      };
    });
  }, [room.prompts, submissions]);

  // Get player with their submission for a prompt
  const getPlayerAnswer = (playerId, promptIndex) => {
    const sub = submissions.find(s => s.playerId === playerId);
    return sub?.words[promptIndex]?.trim() || '';
  };

  // Check if word is unique
  const isWordUnique = (promptIndex, word) => {
    if (!word) return false;
    const wordLower = word.toLowerCase().trim();
    const count = analysis[promptIndex].wordCounts.get(wordLower)?.length || 0;
    return count === 1;
  };

  // Get vote result for an answer
  const getVoteResult = (playerId, promptIndex) => {
    const answerId = `${playerId}-${promptIndex}`;
    const result = room.voteResults?.[answerId];
    if (!result) return { accepted: true, acceptCount: 0, rejectCount: 0 };
    return result;
  };

  // Check if answer was accepted by voting
  const isAnswerAccepted = (playerId, promptIndex) => {
    const result = getVoteResult(playerId, promptIndex);
    return result.accepted;
  };

  const isLastRound = room.currentRound >= room.gameConfig.rounds;
  const hasVoting = room.voteResults && Object.keys(room.voteResults).length > 0;

  return (
    <div className="review-round">
      <div className="review-header">
        <div className="review-title">
          <h2>Round {room.currentRound} Complete</h2>
          <p>Letter: <strong>{room.currentLetter}</strong></p>
        </div>
        <div className="round-badge">
          {room.currentRound} / {room.gameConfig.rounds}
        </div>
      </div>

      {/* Scoring Legend */}
      <div className="scoring-legend">
        <div className="legend-item unique">
          <span className="legend-dot"></span>
          <span>Unique & Accepted = +1 point</span>
        </div>
        <div className="legend-item duplicate">
          <span className="legend-dot"></span>
          <span>Duplicate = 0 points</span>
        </div>
        {hasVoting && (
          <div className="legend-item rejected">
            <span className="legend-dot"></span>
            <span>Rejected by votes = 0 points</span>
          </div>
        )}
        <div className="legend-item empty">
          <span className="legend-dot"></span>
          <span>Empty/Invalid = 0 points</span>
        </div>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button 
          className={!showAllAnswers ? 'active' : ''}
          onClick={() => setShowAllAnswers(false)}
        >
          By Prompt
        </button>
        <button 
          className={showAllAnswers ? 'active' : ''}
          onClick={() => setShowAllAnswers(true)}
        >
          By Player
        </button>
      </div>

      {/* Submissions - By Prompt View */}
      {!showAllAnswers && (
        <div className="submissions-by-prompt">
          {analysis.map((item, promptIndex) => (
            <div key={promptIndex} className="prompt-card">
              <div className="prompt-header">
                <span className="prompt-number">{promptIndex + 1}</span>
                <span className="prompt-text">{item.prompt}</span>
                <span className="prompt-stats">
                  {item.uniqueCount} unique, {item.duplicateCount} duplicates
                </span>
              </div>
              <div className="answers-grid">
                {room.players.map(player => {
                  const answer = getPlayerAnswer(player.id, promptIndex);
                  const isUnique = isWordUnique(promptIndex, answer);
                  const accepted = isAnswerAccepted(player.id, promptIndex);
                  const voteResult = getVoteResult(player.id, promptIndex);
                  
                  // Determine status: rejected by votes takes priority
                  let statusClass = 'empty';
                  let scoreText = '0';
                  
                  if (answer) {
                    if (!accepted && hasVoting) {
                      statusClass = 'rejected';
                      scoreText = '0 (rejected)';
                    } else if (isUnique && accepted) {
                      statusClass = 'unique';
                      scoreText = '+1';
                    } else {
                      statusClass = 'duplicate';
                      scoreText = '0';
                    }
                  }
                  
                  return (
                    <div key={player.id} className={`answer-card ${statusClass}`}>
                      <span className="answer-player">{player.name}</span>
                      <span className="answer-word">{answer || '—'}</span>
                      {hasVoting && answer && (
                        <span className="vote-info">
                          <CheckIcon size={12} />{voteResult.acceptCount} <XIcon size={12} />{voteResult.rejectCount}
                        </span>
                      )}
                      <span className="answer-score">{scoreText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submissions - By Player View */}
      {showAllAnswers && (
        <div className="submissions-by-player">
          {room.players.map(player => (
            <div key={player.id} className="player-answers-card">
              <div className="player-card-header">
                <span className="player-name-large">{player.name}</span>
                <span className="player-round-score">+{player.roundScore || 0} this round</span>
              </div>
              <div className="player-answers-list">
                {room.prompts.map((prompt, i) => {
                  const answer = getPlayerAnswer(player.id, i);
                  const isUnique = isWordUnique(i, answer);
                  const statusClass = !answer ? 'empty' : isUnique ? 'unique' : 'duplicate';
                  
                  return (
                    <div key={i} className={`player-answer-row ${statusClass}`}>
                      <span className="answer-prompt-text">{prompt}</span>
                      <span className="answer-word">{answer || '—'}</span>
                      <span className="answer-points">{!answer ? '0' : isUnique ? '+1' : '0'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div className="leaderboard">
        <h3>Standings</h3>
        <div className="leaderboard-list">
          {[...room.players]
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .map((player, index) => (
              <div 
                key={player.id} 
                className={`leaderboard-item ${player.name === playerName ? 'you' : ''} ${index === 0 ? 'leader' : ''}`}
              >
                <div className="rank">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                </div>
                <div className="player-info">
                  <span className="name">{player.name}</span>
                  <span className="round-gain">+{player.roundScore || 0} this round</span>
                </div>
                <div className="total-score">{player.score || 0}</div>
              </div>
            ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="review-footer">
        <div className="next-round-info">
          {isLastRound ? (
            <p>This was the final round!</p>
          ) : (
            <p>Next round: New letter, same prompts</p>
          )}
        </div>
        
        {isHost ? (
          <button onClick={handleContinue} className="continue-button">
            {isLastRound ? 'See Final Results' : `Start Round ${room.currentRound + 1}`}
          </button>
        ) : (
          <div className="waiting-host">
            <div className="waiting-spinner"></div>
            <span>Waiting for host to continue...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewRound;
