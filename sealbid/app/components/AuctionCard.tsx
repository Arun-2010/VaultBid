'use client';

import React from 'react';
import { StatusBadge } from './StatusBadge';

interface AuctionCardProps {
  type: 'nft' | 'token';
  title: string;
  subtitle: string;
  status: 'commit-open' | 'reveal-phase' | 'ended';
  stats: {
    label: string;
    value: string | number;
  }[];
  footerText?: string;
  showDownArrow?: boolean;
}

export function AuctionCard({ 
  type, 
  title, 
  subtitle, 
  status, 
  stats, 
  footerText,
  showDownArrow 
}: AuctionCardProps) {
  return (
    <div className="bg-[#171a21] rounded-[20px] p-6 border border-[#2a2f3a] hover:scale-[1.02] transition-all duration-200 hover:border-purple-500/50">
      {/* Top Row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <p className="text-gray-400 text-sm">{subtitle}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-[#111318] rounded-lg p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
            <p className="text-white font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Down Arrow for Token Type */}
      {showDownArrow && (
        <div className="flex justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-gray-400">
            <path d="M10 5 L5 10 L7.5 10 L7.5 15 L12.5 15 L12.5 10 L15 10 Z"/>
          </svg>
        </div>
      )}

      {/* Footer */}
      {footerText && (
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
            <path d="M4 4 L4 12 L12 12 L12 4 Z M6 6 L10 6 L10 10 L6 10 Z" fill="none" stroke="currentColor" strokeWidth="1"/>
            <path d="M6 6 L10 6 M8 4 L8 6" stroke="currentColor" strokeWidth="1"/>
          </svg>
          <p className="text-gray-400 text-xs">{footerText}</p>
        </div>
      )}
    </div>
  );
}
