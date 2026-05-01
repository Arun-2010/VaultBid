'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { SealBidSDK } from '@/lib/sealbid-sdk';
import { useAuctionTimer, formatTimeRemaining } from '@/hooks/use-auction-timer';
import { CommitBidForm } from './commit-bid-form';
import { RevealBidForm } from './reveal-bid-form';

interface AuctionDetailProps {
  auctionId: string;
}

export function AuctionDetail({ auctionId }: AuctionDetailProps) {
  const { connected, publicKey } = useWallet();
  const [auction, setAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk] = useState(() => new SealBidSDK(
    new PublicKey('https://api.devnet.solana.com'),
    { publicKey: publicKey || new PublicKey('11111111111111111111111111111111'), signTransaction: async () => null, signAllTransactions: async () => null }
  ));

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        setLoading(true);
        const auctionPubkey = new PublicKey(auctionId);
        const auctionInfo = await sdk.getAuctionInfo(auctionPubkey);
        setAuction(auctionInfo);
      } catch (err) {
        console.error('Error fetching auction:', err);
        setError('Failed to load auction details');
      } finally {
        setLoading(false);
      }
    };

    fetchAuction();
  }, [auctionId, sdk]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Auction not found'}</p>
      </div>
    );
  }

  const phase = getAuctionPhase(auction);
  const { timeRemaining, isExpired } = useAuctionTimer(
    phase === 'commit' ? auction.commitDeadline.toNumber() : auction.revealDeadline.toNumber()
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">
              Token Auction #{auctionId.slice(0, 8)}
            </h1>
            <p className="text-secondary-600">
              {formatTokenAmount(auction.tokenAmount.toNumber())} tokens up for auction
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full font-medium ${getPhaseColor(phase)}`}>
            {phase.charAt(0).toUpperCase() + phase.slice(1)} Phase
          </div>
        </div>

        {/* Timer */}
        {phase !== 'ended' && (
          <div className="bg-secondary-50 rounded-lg p-4 mb-6">
            <div className="text-center">
              <p className="text-sm text-secondary-600 mb-2">
                {phase === 'commit' ? 'Commit phase ends in:' : 'Reveal phase ends in:'}
              </p>
              <p className="text-2xl font-bold text-primary-600">
                {formatTimeRemaining(timeRemaining)}
              </p>
            </div>
          </div>
        )}

        {/* Auction Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold text-lg mb-4">Auction Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary-600">Token Amount:</span>
                <span className="font-medium">{formatTokenAmount(auction.tokenAmount.toNumber())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Highest Bid:</span>
                <span className="font-medium">{formatTokenAmount(auction.highestBid.toNumber())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Authority:</span>
                <span className="font-mono text-sm">{auction.authority.toString().slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Status:</span>
                <span className={`font-medium ${auction.settled ? 'text-green-600' : 'text-blue-600'}`}>
                  {auction.settled ? 'Settled' : 'Active'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Timeline</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary-600">Commit Deadline:</span>
                <span className="font-medium">{formatDate(auction.commitDeadline.toNumber())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-600">Reveal Deadline:</span>
                <span className="font-medium">{formatDate(auction.revealDeadline.toNumber())}</span>
              </div>
              {auction.settled && auction.winner.toString() !== '11111111111111111111111111111111' && (
                <div className="flex justify-between">
                  <span className="text-secondary-600">Winner:</span>
                  <span className="font-medium">{auction.winner.toString().slice(0, 8)}...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Forms */}
        {connected && !auction.settled && (
          <div className="border-t border-secondary-200 pt-6">
            {phase === 'commit' && (
              <CommitBidForm auctionId={auctionId} auction={auction} />
            )}
            {phase === 'reveal' && (
              <RevealBidForm auctionId={auctionId} auction={auction} />
            )}
          </div>
        )}

        {!connected && (
          <div className="border-t border-secondary-200 pt-6">
            <p className="text-center text-secondary-600">
              Connect your wallet to participate in this auction
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getAuctionPhase(auction: any): 'commit' | 'reveal' | 'ended' {
  const now = Math.floor(Date.now() / 1000);
  
  if (now < auction.commitDeadline.toNumber()) {
    return 'commit';
  } else if (now < auction.revealDeadline.toNumber()) {
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

function formatTokenAmount(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}
