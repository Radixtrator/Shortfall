'use client';

import { DeckAnalysis, CardOverlap } from '@/types';
import { useState } from 'react';
import { fetchCardPrices, calculateTotalPrice } from '@/lib/scryfall';

const BASIC_LANDS = [
  'plains', 'island', 'swamp', 'mountain', 'forest',
  'snow-covered plains', 'snow-covered island', 'snow-covered swamp', 
  'snow-covered mountain', 'snow-covered forest'
];

const isBasicLand = (cardName: string) => {
  const normalized = cardName.toLowerCase().trim();
  return BASIC_LANDS.includes(normalized);
};

interface OverlapAnalysisProps {
  analysis: DeckAnalysis | null;
}

export default function OverlapAnalysis({ analysis }: OverlapAnalysisProps) {
  const [filter, setFilter] = useState<'all' | 'shortage' | 'sufficient'>('all');
  const [sortBy, setSortBy] = useState<'shortage' | 'decks' | 'name'>('shortage');
  const [includeBasicLands, setIncludeBasicLands] = useState(false);
  const [activeSection, setActiveSection] = useState<'overlapping' | 'notOwned'>('overlapping');
  const [priceMap, setPriceMap] = useState<Map<string, number | null>>(new Map());
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceProgress, setPriceProgress] = useState(0);
  const [priceError, setPriceError] = useState<string | null>(null);
  
  // Separate state for Cards Not Owned section prices
  const [notOwnedPriceMap, setNotOwnedPriceMap] = useState<Map<string, number | null>>(new Map());
  const [notOwnedPriceLoading, setNotOwnedPriceLoading] = useState(false);
  const [notOwnedPriceProgress, setNotOwnedPriceProgress] = useState(0);
  const [notOwnedPriceError, setNotOwnedPriceError] = useState<string | null>(null);
  
  // Deck filter for Cards Not Owned section
  const [selectedDecks, setSelectedDecks] = useState<Set<string>>(new Set());
  const [showDeckFilter, setShowDeckFilter] = useState(false);

  const fetchPrices = async () => {
    if (!analysis) return;
    
    setPriceLoading(true);
    setPriceError(null);
    setPriceProgress(0);
    
    try {
      const cardsToPrice = analysis.overlappingCards
        .filter(c => c.shortage > 0)
        .filter(c => includeBasicLands || !isBasicLand(c.cardName))
        .map(c => ({ name: c.cardName, quantity: c.shortage }));
      
      if (cardsToPrice.length === 0) {
        setPriceError('No missing cards to price');
        setPriceLoading(false);
        return;
      }
      
      const prices = await fetchCardPrices(cardsToPrice, setPriceProgress);
      setPriceMap(prices);
    } catch (error) {
      console.error('Error fetching prices:', error);
      setPriceError('Failed to fetch prices. Please try again.');
    } finally {
      setPriceLoading(false);
    }
  };

  const fetchNotOwnedPrices = async () => {
    if (!analysis) return;
    
    setNotOwnedPriceLoading(true);
    setNotOwnedPriceError(null);
    setNotOwnedPriceProgress(0);
    
    try {
      // Use the filtered cards (respects deck filter)
      const cardsToPrice = analysis.cardsNotOwned
        .filter(c => includeBasicLands || !isBasicLand(c.cardName))
        .filter(c => selectedDecks.size === 0 || c.decks.some(d => selectedDecks.has(d.deckName)))
        .map(c => ({ name: c.cardName, quantity: c.totalNeeded }));
      
      if (cardsToPrice.length === 0) {
        setNotOwnedPriceError('No cards to price');
        setNotOwnedPriceLoading(false);
        return;
      }
      
      const prices = await fetchCardPrices(cardsToPrice, setNotOwnedPriceProgress);
      setNotOwnedPriceMap(prices);
    } catch (error) {
      console.error('Error fetching prices:', error);
      setNotOwnedPriceError('Failed to fetch prices. Please try again.');
    } finally {
      setNotOwnedPriceLoading(false);
    }
  };

  const priceStats = analysis ? calculateTotalPrice(
    analysis.overlappingCards.filter(c => includeBasicLands || !isBasicLand(c.cardName)),
    priceMap
  ) : null;

  const notOwnedPriceStats = analysis ? calculateTotalPrice(
    analysis.cardsNotOwned
      .filter(c => includeBasicLands || !isBasicLand(c.cardName))
      .filter(c => selectedDecks.size === 0 || c.decks.some(d => selectedDecks.has(d.deckName))),
    notOwnedPriceMap
  ) : null;

  if (!analysis) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-lg">No analysis available yet.</p>
        <p className="text-sm mt-1">Upload your collection and at least one deck to see card overlaps.</p>
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

  const exportMissingCards = () => {
    // Get all cards with shortage (includes cards not owned at all)
    const missingCards = analysis.overlappingCards
      .filter(c => c.shortage > 0)
      .filter(c => includeBasicLands || !isBasicLand(c.cardName))
      .map(c => `${c.shortage} ${c.cardName}`)
      .join('\n');
    
    if (!missingCards) {
      alert('No missing cards to export!');
      return;
    }

    // Create and download the file
    const blob = new Blob([missingCards], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'missing-cards.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportNotOwnedCards = () => {
    // Get all cards not owned at all (respects deck filter)
    const notOwnedCards = analysis.cardsNotOwned
      .filter(c => includeBasicLands || !isBasicLand(c.cardName))
      .filter(c => selectedDecks.size === 0 || c.decks.some(d => selectedDecks.has(d.deckName)))
      .map(c => `${c.totalNeeded} ${c.cardName}`)
      .join('\n');
    
    if (!notOwnedCards) {
      alert('No cards to export!');
      return;
    }

    // Create and download the file
    const blob = new Blob([notOwnedCards], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cards-not-owned.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter out basic lands unless toggle is on
  const filterBasicLands = (cards: CardOverlap[]) => {
    if (includeBasicLands) return cards;
    return cards.filter(c => !isBasicLand(c.cardName));
  };

  const filteredOverlappingCards = filterBasicLands(analysis.overlappingCards).filter((card) => {
    if (filter === 'shortage') return card.shortage > 0;
    if (filter === 'sufficient') return card.shortage === 0;
    return true;
  });

  const sortedOverlappingCards = [...filteredOverlappingCards].sort((a, b) => {
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

  // Get all unique deck names from cards not owned
  const allDeckNames = Array.from(
    new Set(
      analysis.cardsNotOwned.flatMap(card => card.decks.map(d => d.deckName))
    )
  ).sort();

  // Filter cards not owned by selected decks
  const filteredNotOwnedCards = filterBasicLands(analysis.cardsNotOwned).filter(card => {
    if (selectedDecks.size === 0) return true; // No filter = show all
    return card.decks.some(d => selectedDecks.has(d.deckName));
  });

  const toggleDeck = (deckName: string) => {
    const newSet = new Set(selectedDecks);
    if (newSet.has(deckName)) {
      newSet.delete(deckName);
    } else {
      newSet.add(deckName);
    }
    setSelectedDecks(newSet);
  };

  const clearDeckFilter = () => {
    setSelectedDecks(new Set());
  };

  const selectAllDecks = () => {
    setSelectedDecks(new Set(allDeckNames));
  };

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveSection('overlapping')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSection === 'overlapping'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Cards in Multiple Decks
          <span className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
            {filterBasicLands(analysis.overlappingCards).length}
          </span>
        </button>
        <button
          onClick={() => setActiveSection('notOwned')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeSection === 'notOwned'
              ? 'border-purple-500 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Missing Cards
          <span className="ml-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
            {filteredNotOwnedCards.length}
          </span>
        </button>
      </div>

      {/* Basic Lands Toggle */}
      <div className="flex items-center gap-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={includeBasicLands}
            onChange={(e) => setIncludeBasicLands(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Include Basic Lands
          </span>
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          (including Snow-Covered)
        </span>
      </div>

      {activeSection === 'overlapping' ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Cards in Multiple Decks"
              value={filterBasicLands(analysis.overlappingCards).length}
              color="blue"
            />
            <StatCard
              label="Cards with Shortage"
              value={filterBasicLands(analysis.overlappingCards).filter(c => c.shortage > 0).length}
              color="red"
            />
            <StatCard
              label="Cards Covered"
              value={filterBasicLands(analysis.overlappingCards).filter(c => c.shortage === 0).length}
              color="green"
            />
            <StatCard
              label="Cards Not Owned"
              value={filterBasicLands(analysis.overlappingCards).filter(c => c.owned === 0).length}
              color="purple"
            />
          </div>

          {/* Filters and Export */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
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
            <div className="flex items-center gap-2">
              <button
                onClick={fetchPrices}
                disabled={priceLoading || filterBasicLands(analysis.overlappingCards).filter(c => c.shortage > 0).length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {priceLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {priceProgress}%
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Get Prices
                  </>
                )}
              </button>
              <button
                onClick={exportMissingCards}
                disabled={filterBasicLands(analysis.overlappingCards).filter(c => c.shortage > 0).length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* Price Summary */}
          {priceStats && priceMap.size > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-lg font-bold text-green-800 dark:text-green-300">
                    Estimated Total: ${priceStats.total.toFixed(2)} USD
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {priceStats.cardsWithPrice} cards priced
                    {priceStats.cardsWithoutPrice > 0 && (
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {' '}• {priceStats.cardsWithoutPrice} cards not found
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Prices from Scryfall (TCGPlayer market)
                </p>
              </div>
            </div>
          )}

          {priceError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm">
              {priceError}
            </div>
          )}

          {/* Card List */}
          <div className="space-y-3">
            {sortedOverlappingCards.map((card) => (
              <CardOverlapItem key={card.cardName} card={card} priceMap={priceMap} />
            ))}
          </div>

          {filteredOverlappingCards.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No cards match the current filter.
            </div>
          )}
        </>
      ) : (
        <>
          {/* Missing Cards Section */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-4">
            <p className="text-purple-700 dark:text-purple-300 text-sm">
              These are cards you need to acquire - you either don&apos;t own them or don&apos;t have enough copies.
            </p>
          </div>

          {/* Deck Filter */}
          <div className="relative">
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setShowDeckFilter(!showDeckFilter)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  selectedDecks.size > 0
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter by Deck
                {selectedDecks.size > 0 && (
                  <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {selectedDecks.size}
                  </span>
                )}
                <svg className={`w-4 h-4 transition-transform ${showDeckFilter ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {selectedDecks.size > 0 && (
                <button
                  onClick={clearDeckFilter}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                >
                  Clear filter
                </button>
              )}
            </div>
            
            {showDeckFilter && (
              <div className="absolute z-10 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Decks</span>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllDecks}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      All
                    </button>
                    <button
                      onClick={clearDeckFilter}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {allDeckNames.map(deckName => (
                    <label
                      key={deckName}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDecks.has(deckName)}
                        onChange={() => toggleDeck(deckName)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{deckName}</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setShowDeckFilter(false)}
                  className="mt-2 w-full py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Buttons for Cards Not Owned */}
          <div className="flex flex-wrap gap-2 items-center justify-end">
            <button
              onClick={fetchNotOwnedPrices}
              disabled={notOwnedPriceLoading || filteredNotOwnedCards.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {notOwnedPriceLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {notOwnedPriceProgress}%
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Get Prices
                </>
              )}
            </button>
            <button
              onClick={exportNotOwnedCards}
              disabled={filteredNotOwnedCards.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>

          {/* Price Summary for Not Owned */}
          {notOwnedPriceStats && notOwnedPriceMap.size > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-lg font-bold text-green-800 dark:text-green-300">
                    Estimated Total: ${notOwnedPriceStats.total.toFixed(2)} USD
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {notOwnedPriceStats.cardsWithPrice} cards priced
                    {notOwnedPriceStats.cardsWithoutPrice > 0 && (
                      <span className="text-yellow-600 dark:text-yellow-400">
                        {' '}• {notOwnedPriceStats.cardsWithoutPrice} cards not found
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Prices from Scryfall (TCGPlayer market)
                </p>
              </div>
            </div>
          )}

          {notOwnedPriceError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm">
              {notOwnedPriceError}
            </div>
          )}

          <div className="space-y-3">
            {filteredNotOwnedCards.map((card) => (
              <CardOverlapItem key={card.cardName} card={card} priceMap={notOwnedPriceMap} />
            ))}
          </div>

          {filteredNotOwnedCards.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              You own at least one copy of every card in your decks!
            </div>
          )}
        </>
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

function CardImagePreview({ cardName, children }: { cardName: string; children: React.ReactNode }) {
  const [showPreview, setShowPreview] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  const imageUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image&version=normal`;

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (isTouchDevice) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Position the preview to the right of the element, or left if not enough space
    let x = rect.right + 10;
    let y = rect.top;
    
    // If preview would go off right edge, position to the left
    if (x + 250 > viewportWidth) {
      x = rect.left - 260;
    }
    
    // Keep preview within viewport vertically
    if (y + 350 > viewportHeight) {
      y = viewportHeight - 360;
    }
    if (y < 10) y = 10;
    
    setPosition({ x, y });
    setShowPreview(true);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => {
        if (!isTouchDevice) {
          setShowPreview(false);
          setImageLoaded(false);
        }
      }}
      onTouchStart={() => setIsTouchDevice(true)}
      onClick={() => {
        if (isTouchDevice) {
          setShowPreview((prev) => {
            if (prev) setImageLoaded(false);
            return !prev;
          });
          // Position centered on screen for touch
          const viewportWidth = window.innerWidth;
          setPosition({ x: (viewportWidth - 250) / 2, y: 80 });
        }
      }}
    >
      {children}
      {showPreview && (
        <div
          className="fixed z-50"
          style={{ left: position.x, top: position.y }}
          onClick={(e) => {
            if (isTouchDevice) {
              e.stopPropagation();
              setShowPreview(false);
              setImageLoaded(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-2 border border-gray-200 dark:border-gray-700">
            {!imageLoaded && (
              <div className="w-[223px] h-[310px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <img
              src={imageUrl}
              alt={cardName}
              className={`w-[223px] h-auto rounded ${imageLoaded ? 'block' : 'hidden'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CardOverlapItem({ card, priceMap }: { card: CardOverlap; priceMap?: Map<string, number | null> }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasShortage = card.shortage > 0;
  const price = priceMap?.get(card.cardName.toLowerCase());
  const totalPrice = price && card.shortage > 0 ? price * card.shortage : null;

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
          <div className="flex items-center gap-2">
            <CardImagePreview cardName={card.cardName}>
              <h3 className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                {card.cardName}
              </h3>
            </CardImagePreview>
            <a
              href={`https://scryfall.com/search?q=!"${encodeURIComponent(card.cardName)}"`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              title="View on Scryfall"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            {price !== undefined && price !== null && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ${price.toFixed(2)} ea
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            In {card.decks.length} decks • Need {card.totalNeeded} • Own {card.owned}
            {hasShortage && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {' '}• Missing {card.shortage}
              </span>
            )}
            {totalPrice !== null && (
              <span className="text-green-600 dark:text-green-400 font-medium">
                {' '}• ${totalPrice.toFixed(2)}
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
