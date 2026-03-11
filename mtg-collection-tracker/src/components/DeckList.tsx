'use client';

import { useState, useRef, useEffect } from 'react';
import { Deck } from '@/types';

interface DeckListProps {
  decks: Deck[];
  onRemove: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRefresh: (id: string) => Promise<void>;
}

function scryfallArtUrl(cardName: string) {
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=art_crop`;
}

function DeckArt({ cardName }: { cardName?: string }) {
  const [errored, setErrored] = useState(false);

  if (!cardName || errored) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center">
        <svg className="w-10 h-10 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={scryfallArtUrl(cardName)}
      alt={cardName}
      className="w-full h-full object-cover object-top"
      onError={() => setErrored(true)}
      loading="lazy"
    />
  );
}

function DeckMenu({
  deck,
  index,
  total,
  onRename,
  onRemove,
  onReorder,
  onRefresh,
  refreshing,
}: {
  deck: Deck;
  index: number;
  total: number;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onRefresh: (id: string) => Promise<void>;
  refreshing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(deck.name);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const saveRename = () => {
    if (name.trim()) onRename(deck.id, name.trim());
    setRenaming(false);
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors backdrop-blur-sm"
        title="Deck options"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-44 bg-[#1e1e1e] border border-[#333] rounded-lg shadow-xl overflow-hidden text-sm">
          {renaming ? (
            <div className="p-2 space-y-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(false); }}
                className="w-full px-2 py-1.5 bg-[#111] border border-[#444] rounded text-neutral-100 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
              />
              <div className="flex gap-1">
                <button onClick={saveRename} className="flex-1 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600">Save</button>
                <button onClick={() => setRenaming(false)} className="flex-1 py-1 text-xs bg-[#333] text-neutral-300 rounded hover:bg-[#444]">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {(deck.archidektId || deck.moxfieldId) && (
                <button
                  onClick={() => { setOpen(false); onRefresh(deck.id); }}
                  disabled={refreshing}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2a] text-neutral-200 disabled:opacity-50"
                >
                  <svg className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
              <button
                onClick={() => setRenaming(true)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2a] text-neutral-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
              <button
                onClick={() => { setOpen(false); onReorder(index, index - 1); }}
                disabled={index === 0}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2a] text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Move up
              </button>
              <button
                onClick={() => { setOpen(false); onReorder(index, index + 1); }}
                disabled={index === total - 1}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2a] text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Move down
              </button>
              <div className="border-t border-[#333]" />
              <button
                onClick={() => { setOpen(false); if (confirm(`Remove "${deck.name}"?`)) onRemove(deck.id); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#2a2a2a] text-red-400"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeckList({ decks, onRemove, onRename, onReorder, onRefresh }: DeckListProps) {
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      await onRefresh(id);
    } finally {
      setRefreshingId(null);
    }
  };

  if (decks.length === 0) {
    return (
      <div className="text-center py-16 text-neutral-500">
        <svg className="w-12 h-12 mx-auto mb-3 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="font-medium">No decks added yet</p>
        <p className="text-sm mt-1">Import a deck using the URL input or upload a file above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {decks.map((deck, index) => (
        <div
          key={deck.id}
          className="group relative bg-[#191919] rounded-xl border border-[#2a2a2a] overflow-hidden flex flex-col hover:border-[#444] transition-colors"
        >
          {/* Art area - 16:9 */}
          <div className="relative w-full" style={{ paddingBottom: '56%' }}>
            <div className="absolute inset-0">
              <DeckArt cardName={deck.commanderName} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-3">
                <span className="text-xs text-white/75 drop-shadow">
                  {deck.cards.reduce((s, c) => s + c.quantity, 0)} cards
                </span>
              </div>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <DeckMenu
                deck={deck}
                index={index}
                total={decks.length}
                onRename={onRename}
                onRemove={onRemove}
                onReorder={onReorder}
                onRefresh={handleRefresh}
                refreshing={refreshingId === deck.id}
              />
            </div>
          </div>

          {/* Info area */}
          <div className="px-3 py-2.5 flex flex-col gap-0.5 border-t border-[#2a2a2a]">
            <h3 className="font-semibold text-neutral-100 text-sm leading-tight line-clamp-1">
              {deck.name}
            </h3>
            {deck.commanderName ? (
              <p className="text-xs text-neutral-500 truncate">{deck.commanderName}</p>
            ) : (
              <p className="text-xs text-neutral-700 italic">No commander</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
