'use client';

import { useState, useEffect, useCallback } from 'react';
import { Collection, Deck, DeckAnalysis } from '@/types';
import { parseCardList, analyzeDeckOverlaps, generateId } from '@/lib/parser';
import { loadCollection, saveCollection, loadDecks, saveDecks, clearAllData } from '@/lib/storage';
import FileUpload from '@/components/FileUpload';
import DeckUrlInput from '@/components/DeckUrlInput';
import DeckList from '@/components/DeckList';
import OverlapAnalysis from '@/components/OverlapAnalysis';
import CollectionSummary from '@/components/CollectionSummary';
import { extractDeckId, fetchArchidektDeck } from '@/lib/archidekt';

export default function Home() {
  const [collection, setCollection] = useState<Collection>({ cards: [], uploadedAt: null });
  const [decks, setDecks] = useState<Deck[]>([]);
  const [analysis, setAnalysis] = useState<DeckAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'analysis'>('upload');
  const [deckName, setDeckName] = useState('');
  const [showDeckNameModal, setShowDeckNameModal] = useState(false);
  const [pendingDeckContent, setPendingDeckContent] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

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

  const handleCollectionUpload = (content: string, fileName: string) => {
    try {
      if (!content.trim()) {
        showNotification('error', 'The file appears to be empty.');
        return;
      }
      
      const cards = parseCardList(content);
      
      if (cards.length === 0) {
        showNotification('error', 'No cards found in file. Please check the format.');
        return;
      }
      
      const newCollection: Collection = {
        cards,
        uploadedAt: new Date(),
      };
      setCollection(newCollection);
      saveCollection(newCollection);
      showNotification('success', `Loaded ${cards.length} cards from ${fileName}`);
    } catch (error) {
      console.error('Error parsing collection:', error);
      showNotification('error', 'Failed to parse collection. Please check the file format.');
    }
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

    try {
      const cards = parseCardList(pendingDeckContent);
      
      if (cards.length === 0) {
        showNotification('error', 'No cards found in deck. Please check the format.');
        setShowDeckNameModal(false);
        setPendingDeckContent(null);
        setDeckName('');
        return;
      }
      
      const newDeck: Deck = {
        id: generateId(),
        name: deckName.trim(),
        cards,
        uploadedAt: new Date(),
      };
      
      const updatedDecks = [...decks, newDeck];
      setDecks(updatedDecks);
      saveDecks(updatedDecks);
      showNotification('success', `Added "${deckName.trim()}" with ${cards.length} cards`);
      
      setShowDeckNameModal(false);
      setPendingDeckContent(null);
      setDeckName('');
    } catch (error) {
      console.error('Error parsing deck:', error);
      showNotification('error', 'Failed to parse deck. Please check the file format.');
      setShowDeckNameModal(false);
      setPendingDeckContent(null);
      setDeckName('');
    }
  };

  const handleDeckUrl = async (url: string) => {
    const deckId = extractDeckId(url);
    if (!deckId) {
      showNotification('error', 'Invalid Archidekt URL or deck ID. Expected format: https://archidekt.com/decks/12345');
      return;
    }

    setUrlLoading(true);
    try {
      const { name, cards } = await fetchArchidektDeck(deckId);

      if (cards.length === 0) {
        showNotification('error', 'No cards found in the deck.');
        return;
      }

      const newDeck: Deck = {
        id: generateId(),
        name,
        cards,
        uploadedAt: new Date(),
      };

      const updatedDecks = [...decks, newDeck];
      setDecks(updatedDecks);
      saveDecks(updatedDecks);
      showNotification('success', `Imported "${name}" with ${cards.length} cards from Archidekt`);
    } catch (error) {
      console.error('Error fetching Archidekt deck:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to fetch deck from Archidekt.');
    } finally {
      setUrlLoading(false);
    }
  };

  const removeDeck = (id: string) => {
    const updatedDecks = decks.filter((d) => d.id !== id);
    setDecks(updatedDecks);
    saveDecks(updatedDecks);
  };

  const renameDeck = (id: string, newName: string) => {
    const updatedDecks = decks.map((d) =>
      d.id === id ? { ...d, name: newName } : d
    );
    setDecks(updatedDecks);
    saveDecks(updatedDecks);
    showNotification('success', `Deck renamed to "${newName}"`);
  };

  const reorderDecks = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= decks.length) return;
    const updatedDecks = [...decks];
    const [movedDeck] = updatedDecks.splice(fromIndex, 1);
    updatedDecks.splice(toIndex, 0, movedDeck);
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
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
              notification.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {notification.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 hover:opacity-75"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHelpModal(true)}
                className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Help & Instructions"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              >
                Clear All Data
              </button>
            </div>
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
                <CollectionSummary collection={collection} decks={decks} onClear={clearCollection} />
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
                <DeckUrlInput onSubmit={handleDeckUrl} loading={urlLoading} />
                <div className="relative flex items-center">
                  <div className="flex-grow border-t border-gray-200 dark:border-gray-600"></div>
                  <span className="flex-shrink mx-3 text-xs text-gray-400 dark:text-gray-500">or upload a file</span>
                  <div className="flex-grow border-t border-gray-200 dark:border-gray-600"></div>
                </div>
                <FileUpload
                  onUpload={handleDeckUpload}
                  label="Upload a deck list"
                  id="deck-upload"
                />
                <DeckList 
                  decks={decks} 
                  onRemove={removeDeck} 
                  onRename={renameDeck}
                  onReorder={reorderDecks}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded p-3">
                  <p className="font-medium mb-1">Supported formats:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Archidekt deck URL (public decks)</li>
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

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                How to Use Deckflict
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Getting Started */}
              <section>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Upload Your Collection
                </h4>
                <div className="text-gray-600 dark:text-gray-300 space-y-2 ml-9">
                  <p>Export your collection from Archidekt:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Go to <a href="https://archidekt.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">archidekt.com</a> and sign in</li>
                    <li>Navigate to your Collection page</li>
                    <li>Click the <strong>⋯</strong> menu or export button</li>
                    <li>Select <strong>Export as CSV</strong></li>
                    <li>Upload the downloaded file to Deckflict</li>
                  </ol>
                </div>
              </section>

              {/* Step 2 */}
              <section>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Add Your Decks
                </h4>
                <div className="text-gray-600 dark:text-gray-300 space-y-2 ml-9">
                  <p>Upload deck lists from Archidekt or other sources:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Open a deck on Archidekt</li>
                    <li>Click <strong>Export</strong> → <strong>Copy to Clipboard</strong> or download as CSV/TXT</li>
                    <li>Paste or upload the deck list to Deckflict</li>
                    <li>Give your deck a name when prompted</li>
                    <li>Repeat for all your decks!</li>
                  </ol>
                </div>
              </section>

              {/* Step 3 */}
              <section>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Analyze Your Cards
                </h4>
                <div className="text-gray-600 dark:text-gray-300 space-y-2 ml-9">
                  <p>Switch to the <strong>Card Count Analysis</strong> tab to see:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Cards in Multiple Decks</strong> — Cards shared across decks</li>
                    <li><strong>Cards Not Owned</strong> — Cards you need to acquire</li>
                    <li><strong>Shortage count</strong> — How many more copies you need</li>
                    <li>Click any card to see which decks use it</li>
                  </ul>
                </div>
              </section>

              {/* Supported Formats */}
              <section>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Supported Formats
                </h4>
                <div className="text-gray-600 dark:text-gray-300 ml-7">
                  <ul className="space-y-2 text-sm">
                    <li><strong>Archidekt CSV</strong> — Full export with set codes, foil status, etc.</li>
                    <li><strong>Standard deck list</strong> — <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">1 Lightning Bolt</code></li>
                    <li><strong>MTGO format</strong> — <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">1x Lightning Bolt</code></li>
                    <li><strong>Arena format</strong> — <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">1 Lightning Bolt (STA) 42</code></li>
                  </ul>
                </div>
              </section>

              {/* Tips */}
              <section>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Tips
                </h4>
                <div className="text-gray-600 dark:text-gray-300 ml-7">
                  <ul className="space-y-2 text-sm">
                    <li>💾 Your data is saved in your browser — it persists between visits</li>
                    <li>🔗 Click the link icon next to any card to look it up on Scryfall</li>
                    <li>📤 Use <strong>Export Missing Cards</strong> to create a buy list</li>
                    <li>🌲 Toggle <strong>Include Basic Lands</strong> to show/hide Plains, Island, etc.</li>
                  </ul>
                </div>
              </section>

              {/* Privacy */}
              <section className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Your Privacy
                </h4>
                <div className="text-green-700 dark:text-green-300 text-sm space-y-2">
                  <p><strong>100% client-side.</strong> All your data stays in your browser.</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>No account or login required</li>
                    <li>No data is sent to any server</li>
                    <li>No cookies or tracking</li>
                    <li>Your collection and decks are stored locally using browser storage</li>
                  </ul>
                </div>
              </section>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Your data stays in your browser. No server, no tracking.</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/Radixtrator/Archidekt-Duplicate-Finder"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
