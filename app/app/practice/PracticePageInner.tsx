'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import PracticeSession from '@/components/PracticeSession';

export default function PracticePageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const lessonId = params.get('lessonId');

  useEffect(() => {
    if (!lessonId) router.replace('/');
  }, [lessonId, router]);

  if (!lessonId) return null;

  return <PracticeSession lessonId={lessonId} />;
}
