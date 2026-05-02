'use client';

import React from 'react';

interface StatusBadgeProps {
  status: 'commit-open' | 'reveal-phase' | 'ended';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'commit-open':
        return {
          text: 'Commit open',
          bgColor: 'bg-purple-500/20',
          textColor: 'text-purple-400'
        };
      case 'reveal-phase':
        return {
          text: 'Reveal phase',
          bgColor: 'bg-yellow-500/20',
          textColor: 'text-yellow-400'
        };
      case 'ended':
        return {
          text: 'Ended',
          bgColor: 'bg-gray-500/20',
          textColor: 'text-gray-400'
        };
      default:
        return {
          text: status,
          bgColor: 'bg-gray-500/20',
          textColor: 'text-gray-400'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`px-3 py-1 rounded-full text-xs ${config.bgColor} ${config.textColor}`}>
      {config.text}
    </div>
  );
}
