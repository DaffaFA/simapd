'use client';
import { useEffect } from 'react';
import { initFcm } from '@/src/lib/firebase';

export function FcmInit() {
  useEffect(() => {
    initFcm().catch(console.error);
  }, []);
  return null;
}
