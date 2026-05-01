'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { AuctionList } from '@/components/auction-list';
import { CreateAuctionButton } from '@/components/create-auction-button';

export default function HomePage() {
  const { connected } = useWallet();

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="text-center mb-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-primary-900 mb-2">
              SealBid
            </h1>
            <p className="text-lg text-secondary-600">
              MEV-Proof Auction System on Solana
            </p>
          </div>
          <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700" />
        </div>
        
        <div className="max-w-3xl mx-auto">
          <p className="text-secondary-700 mb-6">
            Participate in fair, transparent auctions using our commit-reveal scheme. 
            Bid amounts are hidden during the commit phase to prevent front-running and MEV attacks.
          </p>
        </div>
      </header>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mb-12">
        {connected && <CreateAuctionButton />}
        <Link href="/auctions">
          <button className="btn-outline">
            View All Auctions
          </button>
        </Link>
      </div>

      {/* Recent Auctions */}
      <section>
        <h2 className="text-2xl font-bold text-secondary-900 mb-6">
          Recent Auctions
        </h2>
        <AuctionList limit={6} />
      </section>

      {/* How It Works */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-secondary-900 mb-8 text-center">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold">1</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Commit Phase</h3>
            <p className="text-secondary-600 text-sm">
              Submit a hash of your bid amount + random salt. Your actual bid remains hidden.
            </p>
          </div>
          
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold">2</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Reveal Phase</h3>
            <p className="text-secondary-600 text-sm">
              Reveal your actual bid amount and salt to verify your commitment.
            </p>
          </div>
          
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-600 font-bold">3</span>
            </div>
            <h3 className="font-semibold text-lg mb-2">Settlement</h3>
            <p className="text-secondary-600 text-sm">
              Highest valid bid wins. Tokens transferred automatically, losers refunded.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold text-secondary-900 mb-8 text-center">
          Why SealBid?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600">✓</span>
              </div>
              <h3 className="font-semibold">MEV-Proof</h3>
            </div>
            <p className="text-secondary-600 text-sm">
              Commit-reveal scheme prevents front-running and MEV extraction
            </p>
          </div>
          
          <div className="card">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600">✓</span>
              </div>
              <h3 className="font-semibold">Fair & Transparent</h3>
            </div>
            <p className="text-secondary-600 text-sm">
              All transactions on-chain, rules enforced by smart contract
            </p>
          </div>
          
          <div className="card">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600">✓</span>
              </div>
              <h3 className="font-semibold">Non-Custodial</h3>
            </div>
            <p className="text-secondary-600 text-sm">
              You maintain full control of your funds at all times
            </p>
          </div>
          
          <div className="card">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-green-600">✓</span>
              </div>
              <h3 className="font-semibold">Low Fees</h3>
            </div>
            <p className="text-secondary-600 text-sm">
              Built on Solana for fast, cheap transactions
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
