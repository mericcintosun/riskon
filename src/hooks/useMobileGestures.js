"use client";

import { useEffect, useRef, useState } from 'react';

export const useMobileGestures = () => {
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (callback) => {
    if (!touchStartX.current || !touchEndX.current) return;

    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = touchStartY.current - touchEndY.current;

    const minSwipeDistance = 50;
    const maxVerticalDistance = 100;

    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < maxVerticalDistance) {
      if (deltaX > 0) {
        callback('swipe-left');
      } else {
        callback('swipe-right');
      }
    }

    // Reset values
    touchStartX.current = 0;
    touchEndX.current = 0;
    touchStartY.current = 0;
    touchEndY.current = 0;
  };

  return {
    isMobile,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};

export const useSwipeToClose = (onClose, isEnabled = true) => {
  const { handleTouchStart, handleTouchMove, handleTouchEnd, isMobile } = useMobileGestures();

  const touchHandlers = isEnabled && isMobile ? {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: () => handleTouchEnd((direction) => {
      if (direction === 'swipe-left') {
        onClose();
      }
    }),
  } : {};

  return touchHandlers;
};
