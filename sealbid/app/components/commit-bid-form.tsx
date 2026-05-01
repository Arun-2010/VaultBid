'use client';

import { useState } from 'react';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { SealBidSDK } from '@/lib/sealbid-sdk';

interface CommitBidFormProps {
  auctionId: string;
  auction: any;
}

export function CommitBidForm({ auctionId, auction }: CommitBidFormProps) {
  const [bidAmount, setBidAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setError('Please enter a valid bid amount');
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

      const bidAmountBN = new BN(parseFloat(bidAmount) * 1000000); // Convert to smallest unit
      const salt = sdk.generateRandomSalt();
      
      const { commitment, tx } = await sdk.commitBid(
        new PublicKey(auctionId),
        bidAmountBN,
        salt
      );

      // Store salt and bid amount for reveal phase
      localStorage.setItem(`bid_${auctionId}`, JSON.stringify({
        bidAmount: parseFloat(bidAmount),
        salt: Array.from(salt),
        commitment: Array.from(commitment)
      }));

      setSuccess(`Bid committed successfully! Transaction: ${tx.slice(0, 8)}...`);
      setBidAmount('');
    } catch (err: any) {
      console.error('Error committing bid:', err);
      setError(err.message || 'Failed to commit bid');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-4">
        Commit Your Bid
      </h3>
      
      <div className="bg-blue-100 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>Important:</strong> During the commit phase, your bid amount is hidden. 
          We'll generate a cryptographic hash of your bid + random salt. 
          Save your bid details - you'll need them for the reveal phase.
        </p>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Bid Amount</label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              min="0"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="input-field"
              placeholder="0.000000"
              disabled={isLoading}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
              tokens
            </span>
          </div>
          <p className="text-xs text-secondary-600 mt-1">
            Current highest bid: {auction.highestBid.toNumber() / 1000000} tokens
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !bidAmount}
          className="btn-primary w-full"
        >
          {isLoading ? 'Processing...' : 'Commit Bid'}
        </button>
      </form>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">How it works:</h4>
        <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
          <li>You enter your bid amount</li>
          <li>We generate a random salt (32 bytes)</li>
          <li>We create a hash: keccak256(bid_amount + salt)</li>
          <li>Only the hash is submitted to blockchain</li>
          <li>Your actual bid remains hidden until reveal phase</li>
        </ol>
      </div>
    </div>
  );
}
