// Base Mainnet
export const LEADERBOARD_CONTRACT_ADDRESS = '0x9E79c019803937F0C44C3c9DCa73dB9eD27A8eEA' as `0x${string}`;

export const LEADERBOARD_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "_score", "type": "uint256" },
      { "internalType": "string", "name": "_gameType", "type": "string" },
      { "internalType": "string", "name": "_name", "type": "string" }
    ],
    "name": "submitScore",
    "outputs": [{ "internalType": "uint256", "name": "rank", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_gameType", "type": "string" },
      { "internalType": "uint256", "name": "_limit", "type": "uint256" }
    ],
    "name": "getTopScores",
    "outputs": [
      {
        "components": [
          { "internalType": "address", "name": "player", "type": "address" },
          { "internalType": "uint256", "name": "score", "type": "uint256" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "string", "name": "gameType", "type": "string" },
          { "internalType": "string", "name": "name", "type": "string" }
        ],
        "internalType": "struct Leaderboard.Score[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_player", "type": "address" },
      { "internalType": "string", "name": "_gameType", "type": "string" }
    ],
    "name": "getPlayerRank",
    "outputs": [
      { "internalType": "uint256", "name": "rank", "type": "uint256" },
      { "internalType": "uint256", "name": "score", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "game", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "rank", "type": "uint256" }
    ],
    "name": "ScoreSubmitted",
    "type": "event"
  }
] as const;

// Game identifier for this game
export const GAME_ID = 'basenji-bears-v3';
