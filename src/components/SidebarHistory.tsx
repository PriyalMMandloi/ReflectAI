import React, { useState, useMemo } from 'react';
import type { JournalEntry, ReflectionMode } from '../types';
import {
  Search,
  Pin,
  Trash2,
  Calendar,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';

interface SidebarHistoryProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onNewEntry: () => void;
  onTogglePin: (entryId: string, currentPinned: boolean) => void;
  onRequestDelete: (entry: JournalEntry) => void;
  onCloseMobileSidebar?: () => void;
}

export const SidebarHistory: React.FC<SidebarHistoryProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onNewEntry,
  onTogglePin,
  onRequestDelete,
  onCloseMobileSidebar,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pinned' | ReflectionMode>('all');

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.summary && entry.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
        entry.turns.some((t) => t.content.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedFilter === 'pinned') return entry.isPinned;
      if (selectedFilter !== 'all') return entry.reflectionMode === selectedFilter;

      return true;
    });
  }, [entries, searchTerm, selectedFilter]);

  // Group by date
  const groupedEntries = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

    const pinned: JournalEntry[] = [];
    const today: JournalEntry[] = [];
    const yesterday: JournalEntry[] = [];
    const thisWeek: JournalEntry[] = [];
    const older: JournalEntry[] = [];

    filteredEntries.forEach((entry) => {
      if (entry.isPinned && selectedFilter !== 'pinned') {
        pinned.push(entry);
      } else {
        const time = entry.updatedAt || entry.createdAt;
        if (time >= todayStart) {
          today.push(entry);
        } else if (time >= yesterdayStart) {
          yesterday.push(entry);
        } else if (time >= weekStart) {
          thisWeek.push(entry);
        } else {
          older.push(entry);
        }
      }
    });

    return { pinned, today, yesterday, thisWeek, older };
  }, [filteredEntries, selectedFilter]);

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderEntryCard = (entry: JournalEntry) => {
    const isActive = entry.id === activeEntryId;
    const lastTurn = entry.turns[entry.turns.length - 1];
    const previewText = entry.summary || lastTurn?.content || 'Empty reflection...';

    return (
      <div
        key={entry.id}
        id={`entry-card-${entry.id}`}
        onClick={() => {
          onSelectEntry(entry);
          if (onCloseMobileSidebar) onCloseMobileSidebar();
        }}
        className={`group relative p-3 rounded-xl cursor-pointer transition-all border text-left ${
          isActive
            ? 'bg-amber-50/90 border-amber-300/80 shadow-xs ring-1 ring-amber-300/50'
            : 'bg-white hover:bg-stone-50/90 border-stone-200/80 hover:border-stone-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h4
            className={`text-sm font-semibold truncate ${
              isActive ? 'text-amber-950 font-serif-journal' : 'text-stone-800'
            }`}
          >
            {entry.title || 'Untitled Reflection'}
          </h4>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(entry.id, Boolean(entry.isPinned));
              }}
              title={entry.isPinned ? 'Unpin reflection' : 'Pin to top'}
              className={`p-1 rounded hover:bg-stone-200/60 ${
                entry.isPinned ? 'text-amber-600 opacity-100' : 'text-stone-400'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${entry.isPinned ? 'fill-amber-500' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRequestDelete(entry);
              }}
              title="Delete reflection"
              className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Snippet */}
        <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
          {previewText}
        </p>

        {/* Footer Meta */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(entry.updatedAt || entry.createdAt)} &bull; {formatTime(entry.updatedAt || entry.createdAt)}
          </span>

          <div className="flex items-center gap-2">
            {entry.mood && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100/70 text-amber-900 text-[10px] font-medium truncate max-w-[80px]">
                {entry.mood}
              </span>
            )}
            <span className="flex items-center gap-0.5 text-stone-400">
              <MessageSquare className="w-3 h-3" />
              {entry.turns.length}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const hasAnyEntries = entries.length > 0;

  return (
    <aside className="w-full h-full flex flex-col bg-stone-50/80 border-r border-stone-200">
      {/* Search and Filters Header */}
      <div className="p-4 border-b border-stone-200 space-y-3 bg-white/50">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="sidebar-search-input"
            type="text"
            placeholder="Search reflections & notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-stone-900 placeholder:text-stone-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              selectedFilter === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            All ({entries.length})
          </button>
          <button
            onClick={() => setSelectedFilter('pinned')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              selectedFilter === 'pinned'
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Pin className="w-3 h-3" />
            Pinned
          </button>
          <button
            onClick={() => setSelectedFilter('socratic')}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              selectedFilter === 'socratic'
                ? 'bg-amber-800 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            Socratic
          </button>
          <button
            onClick={() => setSelectedFilter('brainstorm')}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              selectedFilter === 'brainstorm'
                ? 'bg-amber-800 text-white'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            }`}
          >
            Sparks
          </button>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {!hasAnyEntries ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3 text-stone-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-stone-600">No reflections yet</p>
            <p className="text-xs text-stone-400 mt-1 max-w-[200px]">
              Start your first reflective conversation with Gemini.
            </p>
            <button
              onClick={onNewEntry}
              className="mt-4 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors"
            >
              Create Reflection
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-6 text-center text-stone-400 text-xs">
            No reflections match your search or filter.
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {groupedEntries.pinned.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-wider text-amber-900 uppercase">
                  <Pin className="w-3 h-3 fill-amber-700 text-amber-700" />
                  <span>Pinned</span>
                </div>
                <div className="space-y-2">
                  {groupedEntries.pinned.map(renderEntryCard)}
                </div>
              </div>
            )}

            {/* Today */}
            {groupedEntries.today.length > 0 && (
              <div className="space-y-2">
                <div className="px-1 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                  Today
                </div>
                <div className="space-y-2">
                  {groupedEntries.today.map(renderEntryCard)}
                </div>
              </div>
            )}

            {/* Yesterday */}
            {groupedEntries.yesterday.length > 0 && (
              <div className="space-y-2">
                <div className="px-1 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                  Yesterday
                </div>
                <div className="space-y-2">
                  {groupedEntries.yesterday.map(renderEntryCard)}
                </div>
              </div>
            )}

            {/* Past 7 Days */}
            {groupedEntries.thisWeek.length > 0 && (
              <div className="space-y-2">
                <div className="px-1 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                  Past 7 Days
                </div>
                <div className="space-y-2">
                  {groupedEntries.thisWeek.map(renderEntryCard)}
                </div>
              </div>
            )}

            {/* Older */}
            {groupedEntries.older.length > 0 && (
              <div className="space-y-2">
                <div className="px-1 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                  Older
                </div>
                <div className="space-y-2">
                  {groupedEntries.older.map(renderEntryCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
