import { PracticeItem, QueueItem } from '@/types';

export async function generatePrompt(item: QueueItem): Promise<PracticeItem> {
  const res = await fetch('/api/practice/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Generate failed: ${err}`);
  }
  const data = await res.json();
  return { ...item, ...data };
}

export async function gradeAnswer(
  item: PracticeItem,
  userAnswer: string,
): Promise<{ correct: boolean; correction?: string }> {
  const res = await fetch('/api/practice/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expectedAnswer: item.expectedAnswer, userAnswer }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Grade failed: ${err}`);
  }
  return res.json();
}
