'use client';

import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Auction {
  publicKey: string;
  account: {
    authority: string;
    tokenMint: string;
    tokenAmount: number;
    commitDeadline: number;
    revealDeadline: number;
    highestBid: number;
    winner: string;
    settled: boolean;
  };
}

interface AuctionListProps {
  limit?: number;
}

export function AuctionList({ limit }: AuctionListProps) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for now - in real implementation, fetch from blockchain
    const mockAuctions: Auction[] = [
      {
        publicKey: '11111111111111111111111111111111',
        account: {
          authority: '22222222222222222222222222222222',
          tokenMint: 'So11111111111111111111111111111111111111112',
          tokenAmount: 1000000,
          commitDeadline: Date.now() / 1000 + 3600, // 1 hour from now
          revealDeadline: Date.now() / 1000 + 7200, // 2 hours from now
          highestBid: 0,
          winner: '11111111111111111111111111111111',
          settled: false,
        },
      },
      {
        publicKey: '33333333333333333333333333333333',
        account: {
          authority: '44444444444444444444444444444444',
          tokenMint: 'So11111111111111111111111111111111111111112',
          tokenAmount: 500000,
          commitDeadline: Date.now() / 1000 - 1800, // 30 minutes ago
          revealDeadline: Date.now() / 1000 + 1800, // 30 minutes from now
          highestBid: 250000,
          winner: '55555555555555555555555555555555',
          settled: false,
        },
      },
    ];

    setAuctions(limit ? mockAuctions.slice(0, limit) : mockAuctions);
    setLoading(false);
  }, [limit]);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-secondary-200 rounded mb-2"></div>
            <div className="h-4 bg-secondary-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-secondary-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary-600">No auctions found</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {auctions.map((auction) => {
        const phase = getAuctionPhase(auction.account);
        const timeRemaining = getTimeRemaining(auction.account, phase);
        
        return (
          <Link key={auction.publicKey} href={`/auction/${auction.publicKey}`}>
            <div className="card hover:shadow-xl transition-shadow cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    Token Auction #{auction.publicKey.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-secondary-600">
                    {formatTokenAmount(auction.account.tokenAmount)} tokens
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPhaseColor(phase)}`}>
                  {phase.charAt(0).toUpperCase() + phase.slice(1)}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-600">Highest Bid:</span>
                  <span className="font-medium">
                    {formatTokenAmount(auction.account.highestBid)}
                  </span>
                </div>
                
                {timeRemaining && (
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Time Remaining:</span>
                    <span className="font-medium">{timeRemaining}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-secondary-600">Status:</span>
                  <span className={`font-medium ${auction.account.settled ? 'text-green-600' : 'text-blue-600'}`}>
                    {auction.account.settled ? 'Settled' : 'Active'}
                  </span>
                </div>
              </div>
              
              {auction.account.settled && auction.account.winner !== '11111111111111111111111111111111' && (
                <div className="mt-4 pt-4 border-t border-secondary-200">
                  <p className="text-sm text-secondary-600">
                    Winner: {auction.account.winner.slice(0, 8)}...
                  </p>
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function getAuctionPhase(auction: Auction['account']): 'commit' | 'reveal' | 'ended' {
  const now = Date.now() / 1000;
  
  if (now < auction.commitDeadline) {
    return 'commit';
  } else if (now < auction.revealDeadline) {
    return 'reveal';
  } else {
    return 'ended';
  }
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'commit':
      return 'bg-blue-100 text-blue-800';
    case 'reveal':
      return 'bg-yellow-100 text-yellow-800';
    case 'ended':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getTimeRemaining(auction: Auction['account'], phase: string): string | null {
  const now = Date.now() / 1000;
  
  if (phase === 'commit') {
    const seconds = auction.commitDeadline - now;
    if (seconds <= 0) return null;
    return formatDistanceToNow(auction.commitDeadline * 1000, { addSuffix: true });
  } else if (phase === 'reveal') {
    const seconds = auction.revealDeadline - now;
    if (seconds <= 0) return null;
    return formatDistanceToNow(auction.revealDeadline * 1000, { addSuffix: true });
  }
  
  return null;
}

function formatTokenAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}
