'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { SealBidSDK } from '@/lib/sealbid-sdk';
import { useRouter } from 'next/navigation';

export function CreateAuctionButton() {
  const { connected, publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (!connected) {
    return null;
  }

  const handleCreateAuction = async () => {
    setIsLoading(true);
    try {
      // Navigate to create auction page
      router.push('/create');
    } catch (error) {
      console.error('Error navigating to create auction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCreateAuction}
      disabled={isLoading}
      className="btn-primary"
    >
      {isLoading ? 'Loading...' : 'Create New Auction'}
    </button>
  );
}
