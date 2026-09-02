import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, type User } from './lib/firebase';
import { subscribeToUserEntries, createJournalEntry, updateJournalEntry, deleteJournalEntry } from './services/firestoreService';
import type { JournalEntry } from './types';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { SidebarHistory } from './components/SidebarHistory';
import { JournalEditor } from './components/JournalEditor';
import { DeleteModal } from './components/DeleteModal';
import { Loader2, Sparkles, PlusCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Deletion modal state
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time subscribe to Firestore entries for the authenticated user
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setActiveEntryId(null);
      return;
    }

    const unsubscribe = subscribeToUserEntries(
      user.uid,
      (fetchedEntries) => {
        setEntries(fetchedEntries);
        // If no active entry is selected, or current active is not in list, select the newest one
        setActiveEntryId((currentId) => {
          if (fetchedEntries.length === 0) return null;
          if (currentId && fetchedEntries.some((e) => e.id === currentId)) {
            return currentId;
          }
          return fetchedEntries[0].id;
        });
      },
      (err) => {
        console.error('Failed to load user entries from Firestore:', err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle New Entry creation
  const handleCreateNewEntry = async () => {
    if (!user) return;
    try {
      const newId = await createJournalEntry(user.uid, {
        title: 'New Reflection',
        turns: [],
        reflectionMode: 'socratic',
      });
      setActiveEntryId(newId);
      setIsMobileSidebarOpen(false);
    } catch (err) {
      console.error('Error creating new entry:', err);
    }
  };

  // Handle Pin/Unpin
  const handleTogglePin = async (entryId: string, currentPinned: boolean) => {
    if (!user) return;
    try {
      await updateJournalEntry(user.uid, entryId, { isPinned: !currentPinned });
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = async () => {
    if (!user || !entryToDelete) return;
    try {
      setIsDeleting(true);
      await deleteJournalEntry(user.uid, entryToDelete.id);
      setEntryToDelete(null);
    } catch (err) {
      console.error('Error deleting entry:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center text-stone-600 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium">Connecting to secure session...</p>
      </div>
    );
  }

  // Not signed in: Show Landing Page
  if (!user) {
    return <LandingPage />;
  }

  const activeEntry = entries.find((e) => e.id === activeEntryId);

  return (
    <div className="h-screen w-screen flex flex-col bg-stone-100 overflow-hidden select-none">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onNewEntry={handleCreateNewEntry}
        entriesCount={entries.length}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar (320px) */}
        <div className="hidden lg:block w-80 shrink-0 h-full">
          <SidebarHistory
            entries={entries}
            activeEntryId={activeEntryId}
            onSelectEntry={(entry) => setActiveEntryId(entry.id)}
            onNewEntry={handleCreateNewEntry}
            onTogglePin={handleTogglePin}
            onRequestDelete={(entry) => setEntryToDelete(entry)}
          />
        </div>

        {/* Mobile Drawer Overlay */}
        {isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative w-80 max-w-[85vw] h-full bg-white shadow-xl z-50">
              <SidebarHistory
                entries={entries}
                activeEntryId={activeEntryId}
                onSelectEntry={(entry) => {
                  setActiveEntryId(entry.id);
                  setIsMobileSidebarOpen(false);
                }}
                onNewEntry={handleCreateNewEntry}
                onTogglePin={handleTogglePin}
                onRequestDelete={(entry) => setEntryToDelete(entry)}
                onCloseMobileSidebar={() => setIsMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Center / Main Content Area */}
        <main className="flex-1 h-full flex flex-col overflow-hidden bg-white">
          {activeEntry ? (
            <JournalEditor
              key={activeEntry.id}
              userId={user.uid}
              entry={activeEntry}
              onRequestDelete={(entry) => setEntryToDelete(entry)}
              onTogglePin={handleTogglePin}
            />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-stone-50/50">
              <div className="w-16 h-16 rounded-3xl bg-amber-100/80 text-amber-800 flex items-center justify-center mb-4 shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="font-serif-journal text-2xl font-bold text-stone-900">
                Welcome, {user.displayName?.split(' ')[0] || 'Friend'}
              </h2>
              <p className="text-sm text-stone-500 max-w-md mt-2 leading-relaxed">
                Your private reflections and conversational turns with Gemini are isolated to your account in Firestore.
              </p>
              <button
                id="empty-create-reflection-btn"
                onClick={handleCreateNewEntry}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Begin a New Reflection</span>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={Boolean(entryToDelete)}
        entry={entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
