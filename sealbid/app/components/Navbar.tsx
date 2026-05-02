'use client';

import React from 'react';

export function Navbar() {
  return (
    <nav className="flex items-center justify-between p-6">
      {/* Left: Logo */}
      <div className="text-white font-semibold text-lg">
        SealBid
      </div>

      {/* Right: Wallet and Create Button */}
      <div className="flex items-center gap-4">
        {/* Wallet Pill */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-white text-sm">7xK4...f3Rp</span>
        </div>

        {/* Create Auction Button */}
        <button className="px-4 py-2 rounded-lg border border-gray-600 text-white hover:bg-gray-800 transition-colors">
          + Create auction
        </button>

        {/* 3-dot Menu */}
        <button className="text-gray-400 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="10" cy="5" r="2"/>
            <circle cx="10" cy="10" r="2"/>
            <circle cx="10" cy="15" r="2"/>
          </svg>
        </button>
      </div>
    </nav>
  );
}
