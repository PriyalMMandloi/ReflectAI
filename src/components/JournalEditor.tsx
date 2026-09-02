import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import type { JournalEntry, ReflectionMode, Turn } from '../types';
import { REFLECTION_PRESETS } from '../data/presets';
import { generateGeminiReflection, generateGeminiSummary } from '../services/geminiService';
import { addTurnToEntry, updateJournalEntry } from '../services/firestoreService';
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  Copy,
  Check,
  Compass,
  Pin,
  Trash2,
  FileText,
  Heart,
  CheckCircle2,
  Download,
  Lightbulb,
  CornerDownLeft,
  ChevronDown,
} from 'lucide-react';

interface JournalEditorProps {
  userId: string;
  entry: JournalEntry;
  onEntryUpdated?: () => void;
  onRequestDelete: (entry: JournalEntry) => void;
  onTogglePin: (entryId: string, currentPinned: boolean) => void;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  userId,
  entry,
  onRequestDelete,
  onTogglePin,
}) => {
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedTurnId, setCopiedTurnId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(entry.title || 'Untitled Reflection');
  const [selectedMode, setSelectedMode] = useState<ReflectionMode>(entry.reflectionMode || 'socratic');

  const turnsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync title when entry prop changes
  useEffect(() => {
    setTitleText(entry.title || 'Untitled Reflection');
    setSelectedMode(entry.reflectionMode || 'socratic');
    setErrorMessage(null);
  }, [entry.id, entry.title, entry.reflectionMode]);

  // Auto scroll to bottom of turns
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entry.turns, isGenerating]);

  // Handle title save
  const handleSaveTitle = async () => {
    setIsEditingTitle(false);
    if (titleText.trim() && titleText !== entry.title) {
      await updateJournalEntry(userId, entry.id, { title: titleText.trim() });
    }
  };

  // Handle reflection mode switch
  const handleModeChange = async (mode: ReflectionMode) => {
    setSelectedMode(mode);
    await updateJournalEntry(userId, entry.id, { reflectionMode: mode });
  };

  // Copy turn text
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTurnId(id);
    setTimeout(() => setCopiedTurnId(null), 2000);
  };

  // Handle Sending Turn
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText.trim();
    if (!textToSend || isGenerating) return;

    setInputText('');
    setErrorMessage(null);
    setIsGenerating(true);

    const now = Date.now();
    const userTurn: Turn = {
      id: `user-${now}`,
      role: 'user',
      content: textToSend,
      timestamp: now,
      mode: selectedMode,
    };

    const updatedTurns = [...entry.turns, userTurn];

    try {
      // Optimistically update Firestore with user's turn
      await addTurnToEntry(userId, entry.id, updatedTurns);

      // Call Gemini backend
      const response = await generateGeminiReflection(textToSend, entry.turns, selectedMode);

      const modelTurn: Turn = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: response.reply,
        timestamp: Date.now(),
        mode: selectedMode,
      };

      const finalTurns = [...updatedTurns, modelTurn];

      // Auto-update title if it's currently generic and this is the first turn
      const isFirstTurn = entry.turns.length === 0;
      let titleUpdate: string | undefined = undefined;
      if (isFirstTurn && (entry.title === 'New Reflection' || entry.title === 'Untitled Reflection')) {
        // Derive a clean short title from the user's prompt
        titleUpdate = textToSend.slice(0, 40).trim() + (textToSend.length > 40 ? '...' : '');
        setTitleText(titleUpdate);
      }

      await addTurnToEntry(
        userId,
        entry.id,
        finalTurns,
        titleUpdate ? { title: titleUpdate } : undefined
      );
    } catch (err: any) {
      console.error('Gemini reflection error:', err);
      setErrorMessage(err.message || 'Unable to receive reflection. Please check Gemini API connection.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // Handle Generate AI Summary
  const handleGenerateSummary = async () => {
    if (entry.turns.length === 0 || isSummarizing) return;

    try {
      setIsSummarizing(true);
      setErrorMessage(null);

      const summaryData = await generateGeminiSummary(entry.turns);

      await updateJournalEntry(userId, entry.id, {
        summary: summaryData.summary,
        takeaways: summaryData.takeaways,
        mood: summaryData.mood,
        title: entry.title === 'New Reflection' || entry.title === 'Untitled Reflection' ? summaryData.title : entry.title,
      });

      if (entry.title === 'New Reflection' || entry.title === 'Untitled Reflection') {
        setTitleText(summaryData.title);
      }
    } catch (err: any) {
      console.error('Summary error:', err);
      setErrorMessage(err.message || 'Failed to generate summary.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Export entry as Markdown
  const handleExportMarkdown = () => {
    const header = `# ${entry.title}\n*Created: ${new Date(entry.createdAt).toLocaleString()}*\n\n`;
    const summarySection = entry.summary
      ? `## AI Reflection Summary\n${entry.summary}\n\n**Mood**: ${entry.mood || 'N/A'}\n\n**Key Takeaways**:\n${(entry.takeaways || []).map((t) => `- ${t}`).join('\n')}\n\n---\n\n`
      : '';
    const conversation = entry.turns
      .map((t) => `### ${t.role === 'user' ? 'Journal Entry' : 'ReflectAI'}\n*${new Date(t.timestamp).toLocaleTimeString()}*\n\n${t.content}\n`)
      .join('\n');

    const fullBlob = new Blob([header + summarySection + conversation], { type: 'text/markdown' });
    const url = URL.createObjectURL(fullBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entry.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'reflection'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentPreset = REFLECTION_PRESETS.find((p) => p.id === selectedMode) || REFLECTION_PRESETS[0];

  const getModeIcon = (mode?: ReflectionMode) => {
    switch (mode) {
      case 'socratic':
        return <Compass className="w-3.5 h-3.5 text-amber-600" />;
      case 'brainstorm':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-600" />;
      case 'summary':
        return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      case 'empathy':
        return <Heart className="w-3.5 h-3.5 text-rose-600" />;
      case 'action':
        return <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-white overflow-hidden">
      {/* Top Header */}
      <div className="border-b border-stone-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 bg-stone-50/50">
        <div className="flex-1 min-w-[240px]">
          {isEditingTitle ? (
            <input
              id="journal-title-edit-input"
              type="text"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              autoFocus
              className="font-serif-journal text-2xl font-bold text-stone-900 border-b-2 border-amber-500 bg-transparent outline-hidden w-full"
            />
          ) : (
            <h1
              id="journal-title-display"
              onClick={() => setIsEditingTitle(true)}
              className="font-serif-journal text-2xl font-bold text-stone-900 hover:text-amber-900 cursor-pointer flex items-center gap-2 group truncate"
              title="Click to rename reflection"
            >
              <span>{entry.title || 'Untitled Reflection'}</span>
              <span className="text-xs text-stone-400 font-sans font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                (edit)
              </span>
            </h1>
          )}

          <div className="mt-1 flex items-center gap-2 text-xs text-stone-400">
            <span>{new Date(entry.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span>&bull;</span>
            <span>{entry.turns.length} conversational turns</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          <div className="relative inline-block">
            <select
              id="reflection-mode-select"
              value={selectedMode}
              onChange={(e) => handleModeChange(e.target.value as ReflectionMode)}
              className="appearance-none bg-white border border-stone-200 text-stone-800 text-xs font-medium rounded-lg pl-3 pr-8 py-2 hover:bg-stone-50 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-xs"
            >
              {REFLECTION_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  Mode: {preset.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* AI Summarize Button */}
          <button
            id="generate-summary-btn"
            onClick={handleGenerateSummary}
            disabled={isSummarizing || entry.turns.length === 0}
            title={entry.turns.length === 0 ? 'Add at least one turn to summarize' : 'Generate executive reflection summary'}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
          >
            {isSummarizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-800" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            )}
            <span className="hidden sm:inline">Synthesize</span>
          </button>

          {/* Pin */}
          <button
            id="pin-entry-btn"
            onClick={() => onTogglePin(entry.id, Boolean(entry.isPinned))}
            title={entry.isPinned ? 'Unpin' : 'Pin to top'}
            className={`p-2 rounded-lg border transition-colors ${
              entry.isPinned
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
            }`}
          >
            <Pin className={`w-4 h-4 ${entry.isPinned ? 'fill-amber-600' : ''}`} />
          </button>

          {/* Export */}
          <button
            id="export-markdown-btn"
            onClick={handleExportMarkdown}
            title="Export as Markdown"
            className="p-2 rounded-lg bg-white border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            id="delete-entry-btn"
            onClick={() => onRequestDelete(entry)}
            title="Delete this reflection"
            className="p-2 rounded-lg bg-white border border-stone-200 text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-800 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* AI Summary Card (If Present) */}
        {entry.summary && (
          <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-xs relative">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-amber-200 text-amber-900">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-serif-journal font-bold text-amber-950 text-base">
                  Executive Reflection & Insights
                </span>
              </div>
              {entry.mood && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200/90 text-amber-950 text-xs font-medium border border-amber-300">
                  {entry.mood}
                </span>
              )}
            </div>

            <p className="text-sm text-stone-700 leading-relaxed italic">
              &ldquo;{entry.summary}&rdquo;
            </p>

            {entry.takeaways && entry.takeaways.length > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200/60">
                <p className="text-xs font-semibold text-amber-900 mb-1.5 uppercase tracking-wider">
                  Key Takeaways & Intentions
                </p>
                <ul className="space-y-1 text-xs text-stone-700">
                  {entry.takeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold mt-0.5">&bull;</span>
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Empty State / Prompt Ideas */}
        {entry.turns.length === 0 ? (
          <div className="py-8 max-w-2xl mx-auto text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto shadow-xs">
              <Compass className="w-6 h-6" />
            </div>

            <div>
              <h2 className="font-serif-journal text-2xl font-bold text-stone-900">
                {currentPreset.label}
              </h2>
              <p className="text-sm text-stone-600 max-w-md mx-auto mt-1 leading-relaxed">
                {currentPreset.description}
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-2 text-left">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider text-center">
                Inspiration Prompts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentPreset.samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(prompt)}
                    className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-amber-50/80 hover:border-amber-300 text-left text-xs text-stone-700 transition-all group flex items-start gap-2 cursor-pointer"
                  >
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="group-hover:text-stone-950 leading-relaxed">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Turns List */
          <div className="space-y-6 max-w-3xl mx-auto">
            {entry.turns.map((turn, index) => {
              const isUser = turn.role === 'user';
              return (
                <div
                  key={turn.id || index}
                  className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Model Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 relative group ${
                      isUser
                        ? 'bg-stone-900 text-stone-50 rounded-tr-xs shadow-xs'
                        : 'bg-stone-50 border border-stone-200/80 text-stone-900 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    {/* Header meta */}
                    <div className="flex items-center justify-between gap-3 text-[11px] mb-2 pb-1.5 border-b border-black/5 dark:border-white/10 opacity-75">
                      <span className="font-semibold flex items-center gap-1">
                        {isUser ? 'Your Journal Note' : 'ReflectAI'}
                        {!isUser && turn.mode && (
                          <span className="ml-1 font-normal text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                            {turn.mode}
                          </span>
                        )}
                      </span>
                      <span>{new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Content */}
                    {isUser ? (
                      <div className="font-serif-journal text-base sm:text-lg leading-relaxed whitespace-pre-wrap font-normal">
                        {turn.content}
                      </div>
                    ) : (
                      <div className="markdown-body text-sm leading-relaxed text-stone-800 space-y-2">
                        <Markdown>{turn.content}</Markdown>
                      </div>
                    )}

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopyText(turn.id, turn.content)}
                      className={`absolute bottom-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                        isUser
                          ? 'bg-stone-800 text-stone-300 hover:text-white'
                          : 'bg-stone-200/80 text-stone-600 hover:text-stone-900'
                      }`}
                      title="Copy text"
                    >
                      {copiedTurnId === turn.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 shadow-xs mt-1">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Generating Indicator */}
            {isGenerating && (
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center shrink-0 animate-pulse">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl rounded-tl-xs bg-stone-50 border border-stone-200 text-stone-600 text-xs flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Gemini is reflecting on your thoughts...</span>
                </div>
              </div>
            )}

            <div ref={turnsEndRef} />
          </div>
        )}
      </div>

      {/* Input Box Footer */}
      <div className="border-t border-stone-200 p-4 sm:p-5 bg-white">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-stone-500">
            <span className="font-semibold text-stone-400 uppercase text-[10px] tracking-wider shrink-0">
              Active Mode:
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-medium shrink-0">
              {getModeIcon(selectedMode)}
              <span>{currentPreset.label}</span>
            </span>
          </div>

          <div className="relative flex items-end gap-2 bg-stone-50 rounded-2xl border border-stone-300/80 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 p-2 transition-all shadow-xs">
            <textarea
              id="journal-input-textarea"
              ref={textareaRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Write your reflection here or ask Gemini (${currentPreset.label.toLowerCase()})...`}
              className="flex-1 bg-transparent border-0 resize-none px-3 py-1.5 text-sm sm:text-base text-stone-900 placeholder:text-stone-400 focus:outline-hidden leading-relaxed font-serif-journal"
            />

            <button
              id="send-reflection-btn"
              onClick={() => handleSendMessage()}
              disabled={isGenerating || !inputText.trim()}
              className="p-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 text-white transition-all shrink-0 cursor-pointer shadow-xs disabled:cursor-not-allowed"
              title="Send entry (Enter)"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-stone-400 px-1">
            <span>Press <kbd className="font-mono bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 text-stone-600">Enter</kbd> to reflect &bull; <kbd className="font-mono bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200 text-stone-600">Shift + Enter</kbd> for line break</span>
            <span>Cloud Firestore auto-sync</span>
          </div>
        </div>
      </div>
    </div>
  );
};
