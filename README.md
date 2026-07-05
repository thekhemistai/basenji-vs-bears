# Basenji vs Bears 🐕🐻

Fast-paced browser survival game: collect BENJI tokens, dodge bears, climb the on-chain leaderboard.

**Play it:** [basenji-bears.vercel.app](https://basenji-bears.vercel.app)

This was our first human + AI agent build — a test of shipping something real end to end with agentic tooling. It stuck around because it was fun.

## Features

- Canvas game engine with sprite animation and sound (no game framework)
- On-chain leaderboard on Base Mainnet — scores submitted via a smart contract, readable by anyone
- Optional wallet connect; the game is fully playable without one
- Farcaster mini-app manifest for playing inside Base App
- Client-side profanity filter on leaderboard names

## Stack

Next.js 14, TypeScript, Tailwind, wagmi/viem, Base Mainnet.

Leaderboard contract: [`0x9E79c019803937F0C44C3c9DCa73dB9eD27A8eEA`](https://basescan.org/address/0x9E79c019803937F0C44C3c9DCa73dB9eD27A8eEA)

## Run locally

```bash
npm install
npm run dev
```

The game runs entirely client-side; leaderboard reads go straight to Base via public RPC.
