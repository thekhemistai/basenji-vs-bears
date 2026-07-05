'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { GameEngine } from '@/lib/game/GameEngine';
import { LEADERBOARD_ABI, GAME_ID, LEADERBOARD_CONTRACT_ADDRESS } from '@/lib/contracts';
import { validateName } from '@/lib/profanity';
import Leaderboard from './Leaderboard';
import ConnectWallet from './ConnectWallet';

interface GameProps {
  onGameOver: () => void;
}

const HIGH_SCORE_THRESHOLD = 100;

function Confetti({ score }: { score: number }) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    left: string;
    color: string;
    delay: string;
    duration: string;
    width: string;
    height: string;
    borderRadius: string;
  }>>([]);

  useEffect(() => {
    if (score < HIGH_SCORE_THRESHOLD) return;
    const count = Math.min(50 + Math.floor((score - HIGH_SCORE_THRESHOLD) / 10), 100);
    const colors = [
      'bg-yellow-400', 'bg-red-500', 'bg-blue-500',
      'bg-green-400', 'bg-purple-500', 'bg-pink-500',
      'bg-orange-400', 'bg-cyan-400',
    ];
    setParticles(
      [...Array(count)].map((_, i) => ({
        id: i,
        left: `${(Math.random() * 100).toFixed(1)}%`,
        color: colors[i % colors.length],
        delay: `${(Math.random() * 1.5).toFixed(2)}s`,
        duration: `${(2 + Math.random() * 2).toFixed(2)}s`,
        width: Math.random() > 0.5 ? '8px' : '6px',
        height: Math.random() > 0.5 ? '8px' : '12px',
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }))
    );
  }, [score]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute ${p.color} animate-confetti-fall`}
          style={{
            left: p.left,
            top: '-20px',
            width: p.width,
            height: p.height,
            borderRadius: p.borderRadius,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

function HUD({ score, hearts }: { score: number; hearts: number }) {
  const prevHearts = useRef(hearts);
  const [heartPulse, setHeartPulse] = useState(false);
  const [scorePop, setScorePop] = useState(false);
  const prevScore = useRef(score);

  useEffect(() => {
    if (hearts < prevHearts.current) {
      setHeartPulse(true);
      setTimeout(() => setHeartPulse(false), 600);
    }
    prevHearts.current = hearts;
  }, [hearts]);

  useEffect(() => {
    if (Math.floor(score) > Math.floor(prevScore.current) && Math.floor(score) % 10 === 0) {
      setScorePop(true);
      setTimeout(() => setScorePop(false), 400);
    }
    prevScore.current = score;
  }, [score]);

  return (
    <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-3 bg-gradient-to-b from-black/70 via-black/40 to-transparent z-10 pointer-events-none">
      {/* Score display */}
      <div className={`flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-yellow-500/30 ${scorePop ? 'animate-score-pop' : ''}`}>
        <span className="text-yellow-400 text-lg">⭐</span>
        <span className="text-white font-bold text-xl font-mono tabular-nums">
          {Math.floor(score).toString().padStart(4, '0')}
        </span>
      </div>

      {/* Hearts display */}
      <div className={`flex items-center gap-1 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-xl border border-red-500/30 ${heartPulse ? 'animate-shake' : ''}`}>
        {[...Array(3)].map((_, i) => (
          <span
            key={i}
            className={`text-2xl transition-all duration-300 ${
              i < hearts
                ? heartPulse && i === hearts - 1 ? 'animate-heartbeat' : ''
                : 'opacity-25 grayscale'
            }`}
            style={{ filter: i < hearts ? 'none' : 'grayscale(1)' }}
          >
            ❤️
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Game({ onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameEngine | null>(null);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmittedHash, setLastSubmittedHash] = useState<`0x${string}` | undefined>(undefined);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState('');

  const { address, isConnected, chainId } = useAccount();
  const { writeContract, isPending, data: hash, error: writeError } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmError } = useWaitForTransactionReceipt({
    hash,
  });

  const { data: playerRank, refetch: refetchRank } = useReadContract({
    address: LEADERBOARD_CONTRACT_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: 'getPlayerRank',
    args: [address || '0x0', GAME_ID],
    query: {
      enabled: false,
    },
  });

  const isHighScore = score >= HIGH_SCORE_THRESHOLD;

  const initGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      // On mobile, fill more of the screen
      const isMobile = window.innerWidth < 768;
      const widthPercent = isMobile ? 0.95 : 0.9;
      const heightPercent = isMobile ? 0.85 : 0.8;
      const maxWidth = isMobile ? window.innerWidth : 800;
      const maxHeight = isMobile ? window.innerHeight * 0.9 : 600;

      canvas.width = Math.min(window.innerWidth * widthPercent, maxWidth);
      canvas.height = Math.min(window.innerHeight * heightPercent, maxHeight);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const game = new GameEngine(canvas, ctx, {
      onScoreChange: setScore,
      onHeartsChange: setHearts,
      onGameOver: () => {
        setGameOver(true);
      },
    });
    gameRef.current = game;
    game.start();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      game.stop();
    };
  };

  useEffect(() => {
    if (gameStarted && !gameOver) {
      return initGame();
    }
  }, [gameStarted]);

  // Capture final score on game over to avoid race condition with changing score
  const finalScoreRef = useRef(0);

  useEffect(() => {
    if (gameOver && score > 0) {
      finalScoreRef.current = Math.floor(score);
    }
  }, [gameOver, score]);

  // Auto-submit score when game is over and wallet is connected
  useEffect(() => {
    if (gameOver && !submitted && isConnected && address && finalScoreRef.current > 0 && playerName) {
      const timer = setTimeout(() => {
        submitScore(finalScoreRef.current);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [gameOver, submitted, isConnected, address, playerName]);

  const submitScore = async (scoreToSubmit?: number) => {
    const finalScore = scoreToSubmit ?? Math.floor(score);
    
    if (!isConnected || !address || !playerName) {
      console.log('Cannot submit:', { isConnected, address: !!address, playerName });
      return;
    }

    console.log('Submitting score:', { score: finalScore, gameType: GAME_ID, playerName });
    
    try {
      writeContract({
        address: LEADERBOARD_CONTRACT_ADDRESS,
        abi: LEADERBOARD_ABI,
        functionName: 'submitScore',
        args: [BigInt(finalScore), GAME_ID, playerName],
      });
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  };

  useEffect(() => {
    if (hash && hash !== lastSubmittedHash && gameOver && !submitted) {
      setLastSubmittedHash(hash);
    }
  }, [hash, lastSubmittedHash, gameOver, submitted]);

  useEffect(() => {
    if (isConfirmed && lastSubmittedHash && hash === lastSubmittedHash && !submitted) {
      setSubmitted(true);
      refetchRank();
    }
  }, [isConfirmed, hash, lastSubmittedHash, submitted]);

  const handleStart = () => {
    const trimmedName = playerName.trim();
    const validation = validateName(trimmedName);
    if (!validation.valid) {
      setNameError(validation.error || 'Invalid name');
      return;
    }
    setPlayerName(trimmedName);
    setNameError('');
    setGameStarted(true);
  };

  const handleRestart = () => {
    setGameOver(false);
    setSubmitted(false);
    setLastSubmittedHash(undefined);
    setScore(0);
    setHearts(3);
    setShowLeaderboard(false);
    gameRef.current?.stop();
    gameRef.current = null;

    // Use double RAF for cleaner timing after cleanup
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        initGame();
      });
    });
  };

  // Name input / start screen
  if (!gameStarted) {
    return (
      <div className="relative z-20 text-center p-8 bg-gradient-to-br from-purple-900/90 via-gray-900/90 to-blue-900/90 backdrop-blur-sm min-h-screen flex flex-col justify-center items-center gap-5">
        {/* Animated title */}
        <div className="space-y-2">
          <div className="w-20 h-20 mx-auto animate-bounce" style={{ animationDuration: '2s' }}>
            <img
              src="/basenji-logo.jpg"
              alt="Basenji"
              className="w-full h-full object-cover rounded-full border-4 border-purple-500/50 shadow-lg shadow-purple-500/30"
            />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold animate-glow" style={{
            background: 'linear-gradient(90deg, #fbbf24, #f97316, #fbbf24)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Basenji vs Bears
          </h2>
          <p className="text-gray-400 text-sm">Enter your name to compete on the leaderboard</p>
        </div>

        {/* Name input */}
        <div className="w-full max-w-xs space-y-3">
          <input
            type="text"
            placeholder="Your name"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              setNameError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            maxLength={32}
            className={`w-full px-4 py-3 bg-gray-900/70 border rounded-xl text-white placeholder-gray-500 focus:outline-none text-center text-lg font-medium transition-all duration-200 ${
              nameError
                ? 'border-red-500 animate-shake focus:border-red-400'
                : 'border-purple-500/40 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20'
            }`}
          />
          {nameError && (
            <p className="text-red-400 text-sm font-medium">{nameError}</p>
          )}
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="relative px-10 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xl font-bold rounded-2xl transition-all duration-200 shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 active:scale-95"
        >
          <span className="relative z-10">🎮 Start Game</span>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/20 to-blue-400/20 blur-xl" />
        </button>

        {/* Leaderboard toggle */}
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="px-6 py-2.5 bg-gray-700/60 hover:bg-gray-600/70 text-gray-300 hover:text-white font-semibold rounded-xl transition-all duration-200 border border-gray-600/40 hover:border-gray-500/60"
        >
          {showLeaderboard ? '✕ Hide Leaderboard' : '🏆 View Leaderboard'}
        </button>

        {showLeaderboard && (
          <div className="w-full max-w-md mx-auto animate-slide-up">
            <Leaderboard showTitle={true} />
          </div>
        )}
      </div>
    );
  }

  // Game over screen
  if (gameOver) {
    return (
      <div className="relative z-20 text-center p-8 bg-gradient-to-br from-purple-900/90 via-gray-900/90 to-blue-900/90 backdrop-blur-sm min-h-screen flex flex-col justify-center items-center gap-5 overflow-hidden">
        {/* Confetti for high scores */}
        <Confetti score={score} />

        {/* Game over header */}
        <div className="space-y-2 animate-slide-up">
          <h2 className="text-5xl md:text-6xl font-bold text-white drop-shadow-2xl">
            {isHighScore ? '🏆 Amazing!' : '💀 Game Over!'}
          </h2>
          {isHighScore && (
            <p className="text-yellow-400 font-semibold text-lg animate-pulse">
              High Score! 🎉
            </p>
          )}
        </div>

        {/* Score display */}
        <div className={`px-8 py-5 rounded-2xl border ${
          isHighScore
            ? 'bg-yellow-900/40 border-yellow-500/50 shadow-lg shadow-yellow-500/20'
            : 'bg-gray-800/60 border-gray-600/40'
        } animate-slide-up`} style={{ animationDelay: '0.1s' }}>
          <p className="text-gray-400 text-sm uppercase tracking-widest mb-1">Final Score</p>
          <p className={`text-5xl font-bold font-mono tabular-nums ${isHighScore ? 'text-yellow-400 animate-glow' : 'text-white'}`}>
            {Math.floor(score)}
          </p>
          {playerRank && Number(playerRank) > 0 && (
            <p className="text-purple-400 text-sm mt-2">Rank #{playerRank?.toString()}</p>
          )}
        </div>

        {/* Score submission status */}
        {isConnected && (
          <div className="text-lg text-gray-300 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            {isPending ? (
              <div className="flex items-center gap-2 text-yellow-400">
                <span className="animate-spin">⏳</span>
                <span>Confirm in wallet...</span>
              </div>
            ) : lastSubmittedHash && isConfirming ? (
              <div className="flex items-center gap-2 text-yellow-400">
                <span className="animate-spin inline-block">⏳</span>
                <span>Saving to chain...</span>
              </div>
            ) : submitted ? (
              <div className="flex flex-col items-center gap-3">
                <span className="text-green-400 font-semibold">✅ Score saved!</span>
                <div className="flex gap-2 flex-wrap justify-center">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I scored ${Math.floor(score)} in Basenji vs Bears! 🧪 Can you beat me? Play at https://basenji-bears.vercel.app`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-black hover:bg-gray-900 text-white font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 text-sm flex items-center gap-1 border border-gray-700 shadow-lg"
                  >
                    𝕏 Share on X
                  </a>
                  <a
                    href={`https://warpcast.com/~/compose?text=${encodeURIComponent(`I scored ${Math.floor(score)} in Basenji vs Bears! 🧪 Can you beat me? https://basenji-bears.vercel.app`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 text-sm flex items-center gap-1 border border-purple-500 shadow-lg shadow-purple-500/20"
                  >
                    🟣 Farcaster
                  </a>
                  <button
                    onClick={() => {
                      const shareData = {
                        title: 'Basenji vs Bears',
                        text: `I scored ${Math.floor(score)} in Basenji vs Bears! 🧪 Can you beat me?`,
                        url: 'https://basenji-bears.vercel.app',
                      };
                      if (navigator.share) {
                        navigator.share(shareData);
                      } else {
                        window.open('https://basenji-bears.vercel.app', '_blank');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 text-sm flex items-center gap-1 shadow-lg shadow-blue-500/20"
                  >
                    🔵 Base App
                  </button>
                </div>
              </div>
            ) : writeError || confirmError ? (
              <span className="text-red-400">Failed to save score</span>
            ) : (
              <button
                onClick={() => submitScore()}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/30"
              >
                💾 Save Score to Leaderboard
              </button>
            )}
          </div>
        )}

        {/* Not connected */}
        {!isConnected && score > 0 && (
          <div className="flex flex-col items-center gap-3 p-5 bg-gray-800/50 rounded-xl border border-gray-600/40 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <p className="text-gray-400 text-sm">Connect wallet to save your score</p>
            <ConnectWallet onConnect={() => {
              if (playerName) submitScore();
            }} />
          </div>
        )}

        {/* Error state */}
        {(writeError || confirmError) && (
          <div className="flex flex-col items-center gap-2 max-w-sm animate-slide-up" style={{ animationDelay: '0.35s' }}>
            <p className="text-orange-400 text-sm text-center">
              {(writeError?.message || confirmError?.message || '').includes('rejected')
                ? '❌ Transaction cancelled'
                : (writeError?.message || confirmError?.message || 'Failed to save score').slice(0, 100)}
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                submitScore();
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-lg transition-all hover:scale-105"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 items-center w-full max-w-xs animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={handleRestart}
            className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-xl font-bold rounded-2xl transition-all duration-200 shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/50 hover:scale-105 active:scale-95"
          >
            🔄 Play Again
          </button>

          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="w-full px-6 py-3 bg-gray-700/60 hover:bg-gray-600/70 text-gray-300 hover:text-white font-semibold rounded-xl transition-all duration-200 border border-gray-600/40 hover:border-gray-500/60"
          >
            {showLeaderboard ? '✕ Hide Leaderboard' : '🏆 View Leaderboard'}
          </button>

          <button
            onClick={onGameOver}
            className="w-full px-6 py-3 bg-blue-700/60 hover:bg-blue-600/70 text-blue-300 hover:text-white font-semibold rounded-xl transition-all duration-200 border border-blue-600/40 hover:border-blue-500/60"
          >
            ← Back to Menu
          </button>
        </div>

        {/* Leaderboard modal overlay */}
        {showLeaderboard && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowLeaderboard(false)}
          >
            {/* Dark backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            {/* Modal content */}
            <div
              className="relative w-full max-w-md animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowLeaderboard(false)}
                className="absolute -top-3 -right-3 z-10 w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-full border border-gray-600 transition-all duration-200 text-sm font-bold"
                aria-label="Close leaderboard"
              >
                ✕
              </button>
              <Leaderboard showTitle={true} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // In-game view
  return (
    <div className="relative">
      <HUD score={score} hearts={hearts} />
      <canvas
        ref={canvasRef}
        className="border-2 border-purple-800/50 rounded-xl bg-gray-900 shadow-2xl shadow-purple-900/30"
      />
    </div>
  );
}
