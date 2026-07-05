import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const LEADERBOARD_ADDRESS = '0xC335a12f1e8A2Aac3E448658023E834324Fa2080';

const ABI = [
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
  }
];

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('PRIVATE_KEY not set');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
  console.log('Wallet address:', account.address);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });

  console.log('Submitting score...');
  
  const hash = await client.writeContract({
    address: LEADERBOARD_ADDRESS,
    abi: ABI,
    functionName: 'submitScore',
    args: [BigInt(100), 'basenji-bears', 'Khem'],
  });

  console.log('Transaction hash:', hash);
  console.log('View on explorer: https://sepolia.basescan.org/tx/' + hash);
}

main().catch(console.error);
