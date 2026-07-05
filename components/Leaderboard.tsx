'use client';

import { useReadContract } from 'wagmi';
import { LEADERBOARD_ABI, GAME_ID, LEADERBOARD_CONTRACT_ADDRESS } from '@/lib/contracts';

interface ScoreEntry {
  player: `0x${string}`;
  score: bigint;
  timestamp: bigint;
  gameType: string;
  name: string;
}

interface LeaderboardProps {
  onClose?: () => void;
  showTitle?: boolean;
}

const RANK_BADGES = ['🥇', '🥈', '🥉'];

const RANK_STYLES = [
  {
    row: 'bg-gradient-to-r from-yellow-900/60 to-yellow-800/30 border border-yellow-500/40 shadow-sm shadow-yellow-500/20',
    score: 'text-yellow-300 font-extrabold',
    name: 'text-yellow-100 font-semibold',
    badge: 'text-2xl drop-shadow',
  },
  {
    row: 'bg-gradient-to-r from-slate-700/60 to-slate-600/30 border border-slate-400/30 shadow-sm shadow-slate-400/10',
    score: 'text-slate-200 font-extrabold',
    name: 'text-slate-100 font-semibold',
    badge: 'text-2xl drop-shadow',
  },
  {
    row: 'bg-gradient-to-r from-orange-900/50 to-orange-800/20 border border-orange-600/30 shadow-sm shadow-orange-600/10',
    score: 'text-orange-300 font-extrabold',
    name: 'text-orange-100 font-semibold',
    badge: 'text-2xl drop-shadow',
  },
];

const DEFAULT_ROW_STYLE = {
  row: 'bg-gray-800/30 border border-gray-700/20 hover:bg-gray-700/30 transition-colors duration-150',
  score: 'text-green-400 font-bold',
  name: 'text-gray-200',
  badge: null,
};

export default function Leaderboard({ onClose, showTitle = true }: LeaderboardProps) {
  const { data: topScores, isLoading, error } = useReadContract({
    address: LEADERBOARD_CONTRACT_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: 'getTopScores',
    args: [GAME_ID, BigInt(10)],
  });

  const formatAddress = (address: `0x${string}`) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/40">
        {showTitle && (
          <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
            🏆 <span>Global Leaderboard</span>
          </h3>
        )}
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-800/50 rounded-lg animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/40">
        {showTitle && <h3 className="text-xl font-bold mb-4 text-white">🏆 Global Leaderboard</h3>}
        <p className="text-red-400 text-sm text-center py-2">Failed to load leaderboard</p>
      </div>
    );
  }

  const scores = topScores as ScoreEntry[] | undefined;

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-700/40 shadow-2xl">
      {showTitle && (
        <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
          🏆 <span>Global Leaderboard</span>
        </h3>
      )}

      {(!scores || scores.length === 0) ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🎮</p>
          <p className="text-gray-400">No scores yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scores.map((entry, index) => {
            const style = index < 3 ? RANK_STYLES[index] : DEFAULT_ROW_STYLE;
            const isTopThree = index < 3;

            return (
              <div
                key={`${entry.player}-${entry.timestamp}`}
                className={`flex items-center justify-between py-2.5 px-3 rounded-xl ${style.row} animate-slide-up`}
                style={{ animationDelay: `${index * 0.06}s`, opacity: 0, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-3">
                  {/* Rank badge */}
                  {isTopThree ? (
                    <span className={`${style.badge} w-8 text-center animate-rank-badge-pop`} style={{ animationDelay: `${index * 0.1}s` }}>
                      {RANK_BADGES[index]}
                    </span>
                  ) : (
                    <span className="w-8 text-center text-gray-500 font-bold text-sm tabular-nums">
                      {index + 1}
                    </span>
                  )}

                  {/* Player name */}
                  <span className={`text-sm ${style.name} truncate max-w-[120px]`}>
                    {entry.name || formatAddress(entry.player)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className={`font-mono text-sm ${style.score} tabular-nums`}>
                    {entry.score.toString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 bg-gray-700/60 hover:bg-gray-600/70 text-gray-300 hover:text-white rounded-xl transition-all duration-200 font-medium text-sm border border-gray-600/30"
        >
          Close
        </button>
      )}
    </div>
  );
}
