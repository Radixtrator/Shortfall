'use client';

import { DeckAnalysis, CardOverlap } from '@/types';
import { useState } from 'react';

interface OverlapAnalysisProps {
  analysis: DeckAnalysis | null;
}

export default function OverlapAnalysis({ analysis }: OverlapAnalysisProps) {
  const [filter, setFilter] = useState<'all' | 'shortage' | 'sufficient'>('all');
  const [sortBy, setSortBy] = useState<'shortage' | 'decks' | 'name'>('shortage');

  if (!analysis) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg">No analysis available yet.</p>
        <p className="text-sm mt-1">Upload your collection and at least 2 decks to see card overlaps.</p>
      </div>
    );
  }

  if (analysis.overlappingCards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <svg className="mx-auto h-16 w-16 mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg">No overlapping cards found!</p>
        <p className="text-sm mt-1">Your decks don&apos;t share any cards.</p>
      </div>
    );
  }

  const filteredCards = analysis.overlappingCards.filter((card) => {
    if (filter === 'shortage') return card.shortage > 0;
    if (filter === 'sufficient') return card.shortage === 0;
    return true;
  });

  const sortedCards = [...filteredCards].sort((a, b) => {
    if (sortBy === 'shortage') {
      if (b.shortage !== a.shortage) return b.shortage - a.shortage;
      return b.decks.length - a.decks.length;
    }
    if (sortBy === 'decks') {
      if (b.decks.length !== a.decks.length) return b.decks.length - a.decks.length;
      return b.shortage - a.shortage;
    }
    return a.cardName.localeCompare(b.cardName);
  });

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Cards in Multiple Decks"
          value={analysis.overlappingCards.length}
          color="blue"
        />
        <StatCard
          label="Cards with Shortage"
          value={analysis.overlappingCards.filter(c => c.shortage > 0).length}
          color="red"
        />
        <StatCard
          label="Cards Covered"
          value={analysis.overlappingCards.filter(c => c.shortage === 0).length}
          color="green"
        />
        <StatCard
          label="Total Cards Needed"
          value={analysis.overlappingCards.reduce((sum, c) => sum + c.totalNeeded, 0)}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">All Cards</option>
            <option value="shortage">Cards with Shortage</option>
            <option value="sufficient">Cards You Own</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
          >
            <option value="shortage">Shortage (High to Low)</option>
            <option value="decks">Number of Decks</option>
            <option value="name">Card Name</option>
          </select>
        </div>
      </div>

      {/* Card List */}
      <div className="space-y-3">
        {sortedCards.map((card) => (
          <CardOverlapItem key={card.cardName} card={card} />
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No cards match the current filter.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  };

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}

function CardOverlapItem({ card }: { card: CardOverlap }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasShortage = card.shortage > 0;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-all ${
        hasShortage
          ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
          : 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">{card.cardName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            In {card.decks.length} decks • Need {card.totalNeeded} • Own {card.owned}
            {hasShortage && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {' '}• Missing {card.shortage}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              hasShortage
                ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
            }`}
          >
            {hasShortage ? `Need ${card.shortage} more` : '✓ Covered'}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Appears in:</p>
            {card.decks.map((deck, index) => (
              <div
                key={index}
                className="flex justify-between items-center text-sm bg-white dark:bg-gray-800 rounded px-3 py-2"
              >
                <span className="text-gray-700 dark:text-gray-300">{deck.deckName}</span>
                <span className="text-gray-500 dark:text-gray-400">×{deck.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
