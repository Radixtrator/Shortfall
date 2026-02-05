'use client';

import { useState, useEffect, useCallback } from 'react';
import { Collection, Deck, DeckAnalysis } from '@/types';
import { parseCardList, analyzeDeckOverlaps, generateId } from '@/lib/parser';
import { loadCollection, saveCollection, loadDecks, saveDecks, clearAllData } from '@/lib/storage';
import FileUpload from '@/components/FileUpload';
import DeckList from '@/components/DeckList';
import OverlapAnalysis from '@/components/OverlapAnalysis';
import CollectionSummary from '@/components/CollectionSummary';

export default function Home() {
  const [collection, setCollection] = useState<Collection>({ cards: [], uploadedAt: null });
  const [decks, setDecks] = useState<Deck[]>([]);
  const [analysis, setAnalysis] = useState<DeckAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis'>('upload');
  const [deckName, setDeckName] = useState('');
  const [showDeckNameModal, setShowDeckNameModal] = useState(false);
  const [pendingDeckContent, setPendingDeckContent] = useState<string | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    setCollection(loadCollection());
    setDecks(loadDecks());
  }, []);

  // Analyze decks when collection or decks change
  const runAnalysis = useCallback(() => {
    if (decks.length >= 1) {
      const result = analyzeDeckOverlaps(collection, decks);
      setAnalysis(result);
    } else {
      setAnalysis(null);
    }
  }, [collection, decks]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const handleCollectionUpload = (content: string) => {
    const cards = parseCardList(content);
    const newCollection: Collection = {
      cards,
      uploadedAt: new Date(),
    };
    setCollection(newCollection);
    saveCollection(newCollection);
  };

  const handleDeckUpload = (content: string, fileName: string) => {
    setPendingDeckContent(content);
    // Extract a default name from the filename
    const defaultName = fileName.replace(/\.(csv|txt)$/i, '').replace(/[-_]/g, ' ');
    setDeckName(defaultName);
    setShowDeckNameModal(true);
  };

  const confirmDeckUpload = () => {
    if (!pendingDeckContent || !deckName.trim()) return;

    const cards = parseCardList(pendingDeckContent);
    const newDeck: Deck = {
      id: generateId(),
      name: deckName.trim(),
      cards,
      uploadedAt: new Date(),
    };
    
    const updatedDecks = [...decks, newDeck];
    setDecks(updatedDecks);
    saveDecks(updatedDecks);
    
    setShowDeckNameModal(false);
    setPendingDeckContent(null);
    setDeckName('');
  };

  const removeDeck = (id: string) => {
    const updatedDecks = decks.filter((d) => d.id !== id);
    setDecks(updatedDecks);
    saveDecks(updatedDecks);
  };

  const clearCollection = () => {
    setCollection({ cards: [], uploadedAt: null });
    saveCollection({ cards: [], uploadedAt: null });
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearAllData();
      setCollection({ cards: [], uploadedAt: null });
      setDecks([]);
      setAnalysis(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Deckflict
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Find missing cards across your MTG decks
              </p>
            </div>
            <button
              onClick={handleClearAll}
              className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Upload Data
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'analysis'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Card Count Analysis
            {analysis && analysis.overlappingCards.length > 0 && (
              <span className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">
                {analysis.overlappingCards.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'upload' ? (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Collection Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Collection
              </h2>
              <div className="space-y-4">
                <CollectionSummary collection={collection} onClear={clearCollection} />
                <FileUpload
                  onUpload={handleCollectionUpload}
                  label="Upload collection from Archidekt"
                  id="collection-upload"
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-3">
                  <p className="font-medium mb-1">How to export from Archidekt:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to your collection on archidekt.com</li>
                    <li>Click the export/download button</li>
                    <li>Choose CSV format</li>
                    <li>Upload the file here</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Decks Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Decks
              </h2>
              <div className="space-y-4">
                <FileUpload
                  onUpload={handleDeckUpload}
                  label="Upload a deck list"
                  id="deck-upload"
                />
                <DeckList decks={decks} onRemove={removeDeck} />
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-3">
                  <p className="font-medium mb-1">Supported formats:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Archidekt CSV export</li>
                    <li>Standard deck list (1 Card Name)</li>
                    <li>MTGO format (1x Card Name)</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Cards Appearing in Multiple Decks
            </h2>
            <OverlapAnalysis analysis={analysis} />
          </section>
        )}
      </div>

      {/* Deck Name Modal */}
      {showDeckNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Name Your Deck
            </h3>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Enter deck name..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmDeckUpload();
                if (e.key === 'Escape') setShowDeckNameModal(false);
              }}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowDeckNameModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeckUpload}
                disabled={!deckName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Deck
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
