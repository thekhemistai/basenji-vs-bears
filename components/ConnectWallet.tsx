'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

interface ConnectWalletProps {
  onConnect?: () => void;
}

export default function ConnectWallet({ onConnect }: ConnectWalletProps) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    const connector = connectors.find(c => c.name === 'Farcaster Mini App') || 
                      connectors.find(c => c.name === 'Base Account') || 
                      connectors[0];
    if (connector) {
      connect({ connector }, {
        onSuccess: () => {
          onConnect?.();
        }
      });
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-white text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleConnect}
        disabled={isPending}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet to Save Score'}
      </button>
      {error && (
        <p className="text-orange-400 text-xs text-center max-w-xs">
          {error.message}
        </p>
      )}
    </div>
  );
}
