'use client';

import { useState, useEffect } from 'react';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { SealBidSDK } from '@/lib/sealbid-sdk';

interface RevealBidFormProps {
  auctionId: string;
  auction: any;
}

export function RevealBidForm({ auctionId, auction }: RevealBidFormProps) {
  const [storedBid, setStoredBid] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Load stored bid data from localStorage
    const bidData = localStorage.getItem(`bid_${auctionId}`);
    if (bidData) {
      try {
        setStoredBid(JSON.parse(bidData));
      } catch (err) {
        console.error('Error parsing stored bid data:', err);
        localStorage.removeItem(`bid_${auctionId}`);
      }
    }
  }, [auctionId]);

  const handleReveal = async () => {
    if (!storedBid) {
      setError('No committed bid found for this auction');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const sdk = new SealBidSDK(
        new PublicKey('https://api.devnet.solana.com'),
        { publicKey: new PublicKey('11111111111111111111111111111111'), signTransaction: async () => null, signAllTransactions: async () => null }
      );

      const bidAmountBN = new BN(storedBid.bidAmount * 1000000); // Convert to smallest unit
      const salt = new Uint8Array(storedBid.salt);
      
      const tx = await sdk.revealBid(
        new PublicKey(auctionId),
        bidAmountBN,
        salt
      );

      setSuccess(`Bid revealed successfully! Transaction: ${tx.slice(0, 8)}...`);
      
      // Clear stored data after successful reveal
      localStorage.removeItem(`bid_${auctionId}`);
      setStoredBid(null);
    } catch (err: any) {
      console.error('Error revealing bid:', err);
      setError(err.message || 'Failed to reveal bid');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-yellow-900 mb-4">
        Reveal Your Bid
      </h3>
      
      <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-yellow-800">
          <strong>Reveal Phase:</strong> Now you can reveal your actual bid amount. 
          The smart contract will verify that your revealed bid matches the commitment 
          you submitted during the commit phase.
        </p>
      </div>

      {storedBid ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-green-800 mb-2">Your Committed Bid:</h4>
          <div className="text-sm text-green-700 space-y-1">
            <p><strong>Bid Amount:</strong> {storedBid.bidAmount} tokens</p>
            <p><strong>Commitment:</strong> {storedBid.commitment.slice(0, 16)}...</p>
            <p className="text-xs mt-2">
              This data was stored locally when you committed your bid.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">
            No committed bid found for this auction. You must commit a bid during the commit phase before revealing.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <button
        onClick={handleReveal}
        disabled={isLoading || !storedBid}
        className="btn-primary w-full"
      >
        {isLoading ? 'Processing...' : 'Reveal Bid'}
      </button>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">Verification Process:</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>You submit your original bid amount and salt</li>
          <li>Smart contract recomputes: keccak256(bid_amount + salt)</li>
          <li>Contract verifies it matches your stored commitment</li>
          <li>If valid, your bid is officially revealed</li>
          <li>If invalid, the reveal is rejected</li>
        </ol>
      </div>
    </div>
  );
}
