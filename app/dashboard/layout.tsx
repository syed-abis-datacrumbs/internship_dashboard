'use client';

import React from 'react';
import { CandidatesProvider } from '@/context/CandidatesContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <CandidatesProvider>{children}</CandidatesProvider>;
}
