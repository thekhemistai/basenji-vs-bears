'use client';

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import Game from '@/components/Game';
import ConnectWallet from '@/components/ConnectWallet';
import { LEADERBOARD_CONTRACT_ADDRESS, LEADERBOARD_ABI, GAME_ID } from '@/lib/contracts';

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);
  const { address, isConnected } = useAccount();

  // Fetch player's rank (used as proxy for engagement)
  const { data: playerRank } = useReadContract({
    address: LEADERBOARD_CONTRACT_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: 'getPlayerRank',
    args: [address || '0x0', GAME_ID],
    query: {
      enabled: isConnected && !!address,
    },
  });

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Animated background gradient - only on menu */}
      {!gameStarted && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900 animate-pulse" style={{animationDuration: '4s'}} />
          
          {/* Deterministic particle styles keep server and client renders in sync. */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full opacity-30 animate-float"
                style={{
                  left: `${(i * 37 + 11) % 100}%`,
                  top: `${(i * 53 + 17) % 100}%`,
                  animationDelay: `${((i * 7) % 50) / 10}s`,
                  animationDuration: `${3 + ((i * 11) % 40) / 10}s`
                }}
              />
            ))}
          </div>
        </>
      )}
      
      {!gameStarted ? (
        <div className="relative z-10 text-center px-4 space-y-6">
          {/* Animated logo / title */}
          <div className="space-y-1">
            <div className="w-20 h-20 md:w-24 md:h-24 mx-auto animate-bounce" style={{ animationDuration: '2.5s' }}>
              <img 
                src="/basenji-logo.jpg" 
                alt="Basenji" 
                className="w-full h-full object-cover rounded-full border-4 border-purple-500/50 shadow-lg shadow-purple-500/30"
              />
            </div>
            <h1
              className="text-5xl md:text-7xl font-bold animate-glow"
              style={{
                background: 'linear-gradient(90deg, #fbbf24, #f97316, #ef4444, #f97316, #fbbf24)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'shimmer 3s ease-in-out infinite, title-glow 2s ease-in-out infinite',
              }}
            >
              Basenji vs Bears
            </h1>
            <p className="text-lg md:text-xl text-gray-400 font-medium">
              Survive the bear apocalypse! 🐻
            </p>
          </div>

          {/* Rank display */}
          {isConnected && playerRank && Number(playerRank) > 0 && (
            <div className="inline-block p-4 bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-yellow-500/40 shadow-lg shadow-yellow-500/20 animate-slide-up">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Your Rank</p>
              <p className="text-4xl font-bold text-yellow-400 animate-glow">#{playerRank?.toString()}</p>
            </div>
          )}

          {/* Wallet connection */}
          <div>
            <ConnectWallet />
          </div>

          {/* Start button */}
          <button
            onClick={() => setGameStarted(true)}
            className="relative px-12 py-5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-2xl font-bold rounded-2xl transition-all duration-200 shadow-2xl shadow-green-500/40 hover:shadow-green-500/60 hover:scale-105 active:scale-95 overflow-hidden group"
          >
            <span className="relative z-10">🎮 Play Now</span>
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-300/20 to-green-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </button>

          {/* Instructions */}
          <div className="p-5 bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/40 max-w-sm mx-auto">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-3 font-semibold">How to Play</p>
            <div className="grid grid-cols-2 gap-3 text-gray-300 text-sm">
              <div className="flex items-center gap-2 bg-gray-800/40 rounded-lg px-3 py-2">
                <span className="text-xl">🖱️</span>
                <span><strong className="text-white">Move:</strong> Mouse/Touch</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-800/40 rounded-lg px-3 py-2">
                <span className="text-xl">🐻</span>
                <span><strong className="text-white">Avoid:</strong> Bears</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-800/40 rounded-lg px-3 py-2">
                <span className="text-xl">🦴</span>
                <span><strong className="text-white">Collect:</strong> Bones</span>
              </div>
              <div className="flex items-center gap-2 bg-gray-800/40 rounded-lg px-3 py-2">
                <span className="text-xl">⚡</span>
                <span><strong className="text-white">Power-ups:</strong> 2x!</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-900/40 rounded-lg px-3 py-2 col-span-2">
                <span className="text-xl">🧊</span>
                <span><strong className="text-blue-300">Blue Bears:</strong> Slow your movement for 3s!</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Game onGameOver={() => setGameStarted(false)} />
      )}
    </main>
  );
}
