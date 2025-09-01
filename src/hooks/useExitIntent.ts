// src/hooks/useExitIntent.ts
import { useState, useEffect } from 'react';

export const useExitIntent = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setShowModal(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return { showModal, setShowModal };
};