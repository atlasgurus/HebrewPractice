'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { lessonService } from '@/services/lessonService';
import { Lesson } from '@/types';

export default function Home() {
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    setLessons(lessonService.getAll());
  }, []);

  return (
    <main className="max-w-xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Hebrew Practice</h1>
      <p className="text-gray-500 mb-8">Practice verb conjugation through conversation.</p>

      {lessons.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 mb-4">No lessons yet.</p>
          <Link
            href="/lessons"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Create your first lesson
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">{lesson.name}</p>
                <p className="text-sm text-gray-400">
                  {lesson.verbs.length} verb{lesson.verbs.length !== 1 ? 's' : ''}
                  {lesson.nouns.length > 0 && ` · ${lesson.nouns.length} nouns`}
                </p>
              </div>
              <Link
                href={`/practice?lessonId=${lesson.id}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  lesson.verbs.length === 0
                    ? 'bg-gray-100 text-gray-400 pointer-events-none'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Practice →
              </Link>
            </div>
          ))}
          <div className="pt-2">
            <Link href="/lessons" className="text-sm text-gray-400 hover:text-gray-600">
              + Manage lessons
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
