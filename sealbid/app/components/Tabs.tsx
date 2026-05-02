'use client';

import React, { useState } from 'react';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Tabs({ activeTab, onTabChange }: TabsProps) {
  const tabs = ['Live auctions', 'My bids', 'Ended'];

  return (
    <div className="flex gap-8 px-6">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`pb-2 transition-colors ${
            activeTab === tab
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
