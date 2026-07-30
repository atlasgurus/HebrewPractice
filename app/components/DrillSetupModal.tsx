'use client';

import { useMemo, useState } from 'react';
import type { Binyan, Tense, Verb } from '@/types';
import { BINYAN_LABELS, TENSE_LABELS } from '@/types';

interface Props {
  verbs: Verb[];
  initialVerbs: string[];   // selected verb.hebrew values; [] = all
  initialTenses: Tense[];   // selected tenses; [] = all
  onCancel: () => void;
  onApply: (verbs: string[], tenses: Tense[]) => void;
}

const ALL_TENSES: Tense[] = ['past', 'present', 'future', 'imperative'];
const ALL_BINYANIM: Binyan[] = ['paal', 'nifal', 'piel', 'pual', 'hitpael', 'hifil', 'hufal'];

export default function DrillSetupModal({ verbs, initialVerbs, initialTenses, onCancel, onApply }: Props) {
  const [search, setSearch] = useState('');
  const [binyanFilter, setBinyanFilter] = useState<Set<Binyan>>(new Set()); // empty = show all
  const [selectedVerbs, setSelectedVerbs] = useState<Set<string>>(
    new Set(initialVerbs.length ? initialVerbs : verbs.map((v) => v.hebrew)),
  );
  const [selectedTenses, setSelectedTenses] = useState<Set<Tense>>(
    new Set(initialTenses.length ? initialTenses : ALL_TENSES),
  );

  const filteredVerbs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return verbs.filter((v) => {
      if (binyanFilter.size > 0 && !binyanFilter.has(v.binyan)) return false;
      if (!q) return true;
      return (
        v.hebrew.includes(search.trim()) ||
        v.english.toLowerCase().includes(q) ||
        (v.root && v.root.includes(search.trim()))
      );
    });
  }, [verbs, search, binyanFilter]);

  function toggleBinyan(b: Binyan) {
    setBinyanFilter((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }

  function toggleVerb(hebrew: string) {
    setSelectedVerbs((prev) => {
      const next = new Set(prev);
      if (next.has(hebrew)) next.delete(hebrew);
      else next.add(hebrew);
      return next;
    });
  }
  function toggleTense(t: Tense) {
    setSelectedTenses((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedVerbs((prev) => {
      const next = new Set(prev);
      for (const v of filteredVerbs) next.add(v.hebrew);
      return next;
    });
  }
  function deselectAllFiltered() {
    setSelectedVerbs((prev) => {
      const next = new Set(prev);
      for (const v of filteredVerbs) next.delete(v.hebrew);
      return next;
    });
  }

  const verbCount = selectedVerbs.size;
  const tenseCount = selectedTenses.size;
  const canApply = verbCount > 0 && tenseCount > 0;

  function handleApply() {
    if (!canApply) return;
    onApply(Array.from(selectedVerbs), Array.from(selectedTenses));
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Drill Setup</h2>
          <p className="text-xs text-gray-500 mt-1">
            Pick which verbs and tenses to drill on. Changes apply immediately.
          </p>
        </div>

        {/* Tenses */}
        <div className="px-4 pt-4">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Tenses</p>
          <div className="flex flex-wrap gap-2">
            {ALL_TENSES.map((t) => {
              const on = selectedTenses.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTense(t)}
                  className={`px-3 py-1 rounded-md border text-sm ${
                    on
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {TENSE_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Verbs */}
        <div className="px-4 pt-4 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Verbs ({verbCount} / {verbs.length} selected)
            </p>
            <div className="flex gap-3">
              <button
                onClick={selectAllFiltered}
                className="text-xs text-blue-600 hover:underline"
              >
                Select all{search ? ' shown' : ''}
              </button>
              <button
                onClick={deselectAllFiltered}
                className="text-xs text-gray-500 hover:underline"
              >
                Clear{search ? ' shown' : ''}
              </button>
            </div>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search verbs (Hebrew, English, or root)…"
            className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="text-xs text-gray-400 self-center mr-1">Binyan:</span>
            {ALL_BINYANIM.map((b) => {
              const on = binyanFilter.has(b);
              return (
                <button
                  key={b}
                  onClick={() => toggleBinyan(b)}
                  className={`px-2 py-0.5 rounded text-xs border ${
                    on
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {BINYAN_LABELS[b]}
                </button>
              );
            })}
            {binyanFilter.size > 0 && (
              <button
                onClick={() => setBinyanFilter(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600 ml-1 self-center"
              >
                clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto border border-gray-100 rounded-md min-h-0">
            {filteredVerbs.length === 0 ? (
              <p className="text-sm text-gray-400 px-3 py-4 text-center">No verbs match.</p>
            ) : (
              filteredVerbs.map((v) => {
                const on = selectedVerbs.has(v.hebrew);
                return (
                  <label
                    key={v.hebrew}
                    className="flex items-center gap-3 px-3 py-1.5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleVerb(v.hebrew)}
                      className="accent-blue-600"
                    />
                    <span className="font-medium w-28 text-right flex-shrink-0" dir="rtl">{v.hebrew}</span>
                    <span className="text-gray-500 flex-1 truncate">{v.english}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {verbCount} verb{verbCount === 1 ? '' : 's'} · {tenseCount} tense{tenseCount === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-1.5 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!canApply}
              className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
