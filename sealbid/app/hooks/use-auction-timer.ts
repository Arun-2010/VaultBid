'use client';

import { useState, useEffect, useCallback } from 'react';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function useAuctionTimer(deadline: number) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
  });
  const [isExpired, setIsExpired] = useState(false);

  const calculateTimeRemaining = useCallback(() => {
    const now = Math.floor(Date.now() / 1000);
    const total = Math.max(0, deadline - now);
    
    if (total === 0) {
      setIsExpired(true);
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
      };
    }

    const days = Math.floor(total / (24 * 60 * 60));
    const hours = Math.floor((total % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((total % (60 * 60)) / 60);
    const seconds = total % 60;

    return {
      days,
      hours,
      minutes,
      seconds,
      total,
    };
  }, [deadline]);

  useEffect(() => {
    const updateTimer = () => {
      setTimeRemaining(calculateTimeRemaining());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeRemaining]);

  return { timeRemaining, isExpired };
}

export function formatTimeRemaining(timeRemaining: TimeRemaining): string {
  const { days, hours, minutes, seconds } = timeRemaining;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}
