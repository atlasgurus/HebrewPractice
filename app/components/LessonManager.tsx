'use client';

import { useEffect, useRef, useState } from 'react';
import { Binyan, BINYAN_LABELS, Lesson, Noun, Verb } from '@/types';
import { lessonService } from '@/services/lessonService';

const BINYAN_OPTIONS = Object.entries(BINYAN_LABELS) as [Binyan, string][];

export default function LessonManager() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newLessonName, setNewLessonName] = useState('');
  const [newVerb, setNewVerb] = useState<Partial<Verb>>({ binyan: 'paal' });
  const [newNoun, setNewNoun] = useState<Partial<Noun>>({});
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = lessons.find((l) => l.id === selectedId) ?? null;

  useEffect(() => {
    const all = lessonService.getAll();
    setLessons(all);
    if (all.length) setSelectedId(all[0].id);
  }, []);

  function refresh() {
    const all = lessonService.getAll();
    setLessons(all);
  }

  function createLesson() {
    const name = newLessonName.trim();
    if (!name) return;
    const lesson = lessonService.create(name);
    setNewLessonName('');
    refresh();
    setSelectedId(lesson.id);
  }

  function deleteLesson(id: string) {
    if (!confirm('Delete this lesson?')) return;
    lessonService.delete(id);
    refresh();
    setSelectedId((prev) => (prev === id ? lessons.find((l) => l.id !== id)?.id ?? null : prev));
  }

  function updateSelected(updated: Lesson) {
    lessonService.update(updated);
    refresh();
  }

  function addVerb() {
    if (!selected || !newVerb.hebrew?.trim() || !newVerb.english?.trim()) return;
    const verb: Verb = {
      hebrew: newVerb.hebrew.trim(),
      english: newVerb.english.trim(),
      root: newVerb.root?.trim() ?? '',
      binyan: newVerb.binyan ?? 'paal',
    };
    updateSelected({ ...selected, verbs: [...selected.verbs, verb] });
    setNewVerb({ binyan: 'paal' });
  }

  function removeVerb(index: number) {
    if (!selected) return;
    updateSelected({ ...selected, verbs: selected.verbs.filter((_, i) => i !== index) });
  }

  function addNoun() {
    if (!selected || !newNoun.hebrew?.trim() || !newNoun.english?.trim()) return;
    const noun: Noun = { hebrew: newNoun.hebrew.trim(), english: newNoun.english.trim() };
    updateSelected({ ...selected, nouns: [...selected.nouns, noun] });
    setNewNoun({});
  }

  function removeNoun(index: number) {
    if (!selected) return;
    updateSelected({ ...selected, nouns: selected.nouns.filter((_, i) => i !== index) });
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/lessons/import', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Import failed');
      }

      const data = await res.json();
      const lesson: Lesson = {
        id: crypto.randomUUID(),
        name: data.name ?? file.name.replace(/\.[^.]+$/, ''),
        createdAt: new Date().toISOString(),
        verbs: data.verbs ?? [],
        nouns: data.nouns ?? [],
      };
      lessonService.update({ ...lesson }); // upsert via update (won't exist yet, use create path)
      const saved = lessonService.create(lesson.name);
      // replace the just-created empty lesson with the imported data
      lessonService.update({ ...saved, verbs: lesson.verbs, nouns: lesson.nouns });
      refresh();
      setSelectedId(saved.id);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function handleExport() {
    if (!selected) return;
    const json = lessonService.exportToJson(selected);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-3 border-b border-gray-200">
          <div className="flex gap-1">
            <input
              value={newLessonName}
              onChange={(e) => setNewLessonName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createLesson()}
              placeholder="New lesson name"
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <button
              onClick={createLesson}
              className="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              +
            </button>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {lessons.map((l) => (
            <li
              key={l.id}
              onClick={() => setSelectedId(l.id)}
              className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm ${
                l.id === selectedId
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex-1 truncate">{l.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteLesson(l.id); }}
                className="text-gray-300 hover:text-red-500 ml-1 flex-shrink-0"
                aria-label="Delete lesson"
              >
                ×
              </button>
            </li>
          ))}
          {!lessons.length && (
            <li className="px-3 py-4 text-xs text-gray-400 text-center">No lessons yet</li>
          )}
        </ul>
        <div className="p-3 border-t border-gray-200 space-y-1">
          <input
            type="file"
            ref={fileRef}
            onChange={handleImport}
            accept="*/*"
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {importing ? (
              <>
                <span className="inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                Importing…
              </>
            ) : (
              'Import file…'
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={!selected}
            className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-40"
          >
            Export JSON
          </button>
          {importError && (
            <p className="text-xs text-red-500 mt-1">{importError}</p>
          )}
        </div>
      </aside>

      {/* Main panel */}
      {selected ? (
        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Lesson name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Lesson Name
            </label>
            <input
              value={selected.name}
              onChange={(e) => updateSelected({ ...selected, name: e.target.value })}
              className="text-xl font-semibold border-b border-gray-200 focus:border-blue-400 focus:outline-none py-1 w-full bg-transparent"
            />
          </div>

          {/* Verbs */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Verbs ({selected.verbs.length})
            </h2>
            <div className="space-y-1 mb-3">
              {selected.verbs.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm group"
                >
                  <span className="font-medium w-24 text-right flex-shrink-0" dir="rtl">{v.hebrew}</span>
                  <span className="text-gray-500 flex-1">{v.english}</span>
                  {v.root && <span className="text-gray-400 text-xs" dir="rtl">{v.root}</span>}
                  <span className="text-indigo-500 text-xs">{BINYAN_LABELS[v.binyan]}</span>
                  <button
                    onClick={() => removeVerb(i)}
                    className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!selected.verbs.length && (
                <p className="text-sm text-gray-400 py-2">No verbs yet. Add one below.</p>
              )}
            </div>
            {/* Add verb form */}
            <div className="flex gap-2 flex-wrap">
              <input
                dir="rtl"
                placeholder="לכתוב"
                value={newVerb.hebrew ?? ''}
                onChange={(e) => setNewVerb((v) => ({ ...v, hebrew: e.target.value }))}
                className="w-28 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                placeholder="to write"
                value={newVerb.english ?? ''}
                onChange={(e) => setNewVerb((v) => ({ ...v, english: e.target.value }))}
                className="flex-1 min-w-[120px] text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                dir="rtl"
                placeholder="כ-ת-ב (root)"
                value={newVerb.root ?? ''}
                onChange={(e) => setNewVerb((v) => ({ ...v, root: e.target.value }))}
                className="w-28 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <select
                value={newVerb.binyan ?? 'paal'}
                onChange={(e) => setNewVerb((v) => ({ ...v, binyan: e.target.value as Binyan }))}
                className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              >
                {BINYAN_OPTIONS.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <button
                onClick={addVerb}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </section>

          {/* Nouns */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Nouns / Fillers ({selected.nouns.length})
              <span className="ml-2 font-normal normal-case text-gray-400">optional — used in practice sentences</span>
            </h2>
            <div className="space-y-1 mb-3">
              {selected.nouns.map((n, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm group"
                >
                  <span className="font-medium w-20 text-right flex-shrink-0" dir="rtl">{n.hebrew}</span>
                  <span className="text-gray-500 flex-1">{n.english}</span>
                  <button
                    onClick={() => removeNoun(i)}
                    className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                dir="rtl"
                placeholder="בית"
                value={newNoun.hebrew ?? ''}
                onChange={(e) => setNewNoun((n) => ({ ...n, hebrew: e.target.value }))}
                className="w-28 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <input
                placeholder="house"
                value={newNoun.english ?? ''}
                onChange={(e) => setNewNoun((n) => ({ ...n, english: e.target.value }))}
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                onClick={addNoun}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </section>
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Create or select a lesson to get started.
        </main>
      )}
    </div>
  );
}
