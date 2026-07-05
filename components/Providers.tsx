'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { baseAccount } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
import { sdk } from '@farcaster/frame-sdk';
import { Attribution } from 'ox/erc8021';
import { useState, useEffect } from 'react';

// Builder Code from base.dev → Settings → Builder Code
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["bc_44xqmser"],
});

const config = createConfig({
  chains: [base],
  connectors: [
    farcasterFrame(),
    baseAccount({
      appName: 'Basenji vs Bears',
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  dataSuffix: DATA_SUFFIX,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Call sdk.actions.ready() when app loads in Mini App context
  useEffect(() => {
    const ready = async () => {
      try {
        await sdk.actions.ready();
        console.log('Mini App ready');
      } catch (e) {
        // Not in Mini App context, ignore
        console.log('Not in Mini App context');
      }
    };
    ready();
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
