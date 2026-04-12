import { Suspense } from 'react';
import PracticePageInner from './PracticePageInner';

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>}>
      <PracticePageInner />
    </Suspense>
  );
}
