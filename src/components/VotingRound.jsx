import { useState, useEffect, useMemo } from 'react';
import { CheckIcon, XIcon } from './Icons';
import './VotingRound.css';

function VotingRound({ socket, room, playerName, isHost }) {
  const [votes, setVotes] = useState(room.votes || {});
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  // Sync votes from room
  useEffect(() => {
    if (room.votes) {
      setVotes(room.votes);
    }
  }, [room.votes]);

  // Listen for vote updates
  useEffect(() => {
    const handleVoteUpdate = ({ answerId, votes: newVotes }) => {
      setVotes(prev => ({
        ...prev,
        [answerId]: newVotes
      }));
    };

    socket.on('vote-updated', handleVoteUpdate);
    return () => socket.off('vote-updated', handleVoteUpdate);
  }, [socket]);

  // Get current player's socket ID
  const myId = useMemo(() => {
    const player = room.players.find(p => p.name === playerName);
    return player?.id;
  }, [room.players, playerName]);

  // Group answers by prompt
  const answersByPrompt = useMemo(() => {
    const grouped = {};
    room.prompts.forEach((prompt, i) => {
      grouped[i] = {
        prompt,
        answers: (room.votingAnswers || []).filter(a => a.promptIndex === i)
      };
    });
    return grouped;
  }, [room.prompts, room.votingAnswers]);

  const handleVote = (answerId, vote) => {
    socket.emit('cast-vote', {
      roomId: room.id,
      answerId,
      vote
    });
  };

  const handleCompleteVoting = () => {
    socket.emit('complete-voting', room.id);
  };

  const getMyVote = (answerId) => {
    const voteData = votes[answerId];
    if (!voteData) return null;
    if (voteData.accept.includes(myId)) return 'accept';
    if (voteData.reject.includes(myId)) return 'reject';
    return null;
  };

  const getVoteCounts = (answerId) => {
    const voteData = votes[answerId] || { accept: [], reject: [] };
    return {
      accept: voteData.accept.length,
      reject: voteData.reject.length
    };
  };

  // Check if all prompts have been reviewed
  const totalAnswers = room.votingAnswers?.length || 0;
  const currentPrompt = answersByPrompt[currentPromptIndex];

  return (
    <div className="voting-round">
      <div className="voting-header">
        <div className="voting-title">
          <h2>Vote on Answers</h2>
          <p>Accept or reject each answer. Majority wins!</p>
        </div>
        <div className="letter-badge">
          Letter: <span>{room.currentLetter}</span>
        </div>
      </div>

      {/* Voting Instructions */}
      <div className="voting-instructions">
        <div className="instruction-item">
          <span className="accept-icon"><CheckIcon size={18} /></span>
          <span>Accept = Valid answer for this prompt</span>
        </div>
        <div className="instruction-item">
          <span className="reject-icon"><XIcon size={18} /></span>
          <span>Reject = Invalid or incorrect answer</span>
        </div>
        <div className="instruction-note">
          If more players accept than reject, the answer counts!
        </div>
      </div>

      {/* Prompt Navigation */}
      <div className="prompt-tabs">
        {room.prompts.map((prompt, i) => (
          <button
            key={i}
            className={`prompt-tab ${i === currentPromptIndex ? 'active' : ''}`}
            onClick={() => setCurrentPromptIndex(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current Prompt */}
      {currentPrompt && (
        <div className="prompt-voting-section">
          <div className="prompt-header">
            <span className="prompt-number">{currentPromptIndex + 1}</span>
            <span className="prompt-text">{currentPrompt.prompt}</span>
          </div>

          {currentPrompt.answers.length === 0 ? (
            <div className="no-answers">
              <p>No valid answers submitted for this prompt</p>
            </div>
          ) : (
            <div className="answers-list">
              {currentPrompt.answers.map((answer) => {
                const myVote = getMyVote(answer.id);
                const counts = getVoteCounts(answer.id);
                const isMyAnswer = answer.playerId === myId;

                return (
                  <div key={answer.id} className={`answer-card ${isMyAnswer ? 'my-answer' : ''}`}>
                    <div className="answer-info">
                      <span className="answer-player">
                        {answer.playerName}
                        {isMyAnswer && <span className="you-tag">(You)</span>}
                      </span>
                      <span className="answer-word">{answer.word}</span>
                    </div>

                    <div className="vote-section">
                      <div className="vote-counts">
                        <span className="accept-count"><CheckIcon size={14} /> {counts.accept}</span>
                        <span className="reject-count"><XIcon size={14} /> {counts.reject}</span>
                      </div>

                      <div className="vote-buttons">
                        <button
                          className={`vote-btn accept ${myVote === 'accept' ? 'active' : ''}`}
                          onClick={() => handleVote(answer.id, 'accept')}
                          disabled={isMyAnswer}
                          title={isMyAnswer ? "Can't vote on your own answer" : "Accept this answer"}
                        >
                          <CheckIcon size={16} /> Accept
                        </button>
                        <button
                          className={`vote-btn reject ${myVote === 'reject' ? 'active' : ''}`}
                          onClick={() => handleVote(answer.id, 'reject')}
                          disabled={isMyAnswer}
                          title={isMyAnswer ? "Can't vote on your own answer" : "Reject this answer"}
                        >
                          <XIcon size={16} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Navigation and Complete */}
      <div className="voting-footer">
        <div className="nav-buttons">
          <button
            className="nav-btn"
            onClick={() => setCurrentPromptIndex(Math.max(0, currentPromptIndex - 1))}
            disabled={currentPromptIndex === 0}
          >
            ← Previous
          </button>
          <span className="prompt-indicator">
            {currentPromptIndex + 1} / {room.prompts.length}
          </span>
          <button
            className="nav-btn"
            onClick={() => setCurrentPromptIndex(Math.min(room.prompts.length - 1, currentPromptIndex + 1))}
            disabled={currentPromptIndex === room.prompts.length - 1}
          >
            Next →
          </button>
        </div>

        {isHost ? (
          <button className="complete-btn" onClick={handleCompleteVoting}>
            Complete Voting & See Results
          </button>
        ) : (
          <div className="waiting-host">
            <span>Waiting for host to complete voting...</span>
          </div>
        )}
      </div>

      {/* Players Panel */}
      <div className="voters-panel">
        <h4>Players ({room.players.length})</h4>
        <div className="voters-list">
          {room.players.map(player => (
            <span key={player.id} className={`voter ${player.name === playerName ? 'you' : ''}`}>
              {player.name}
              {player.id === room.hostId && <span className="host-star">★</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VotingRound;
