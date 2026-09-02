import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { JournalEntry } from '../types';

interface DeleteModalProps {
  isOpen: boolean;
  entry: JournalEntry | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  entry,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-stone-900 font-serif-journal">
            Delete Reflection?
          </h3>
          <p className="text-sm text-stone-600 mt-1">
            Are you sure you want to permanently delete{' '}
            <strong className="text-stone-900">&ldquo;{entry.title || 'Untitled'}&rdquo;</strong>?
            This will remove all associated turns and summaries from your private Firestore collection.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            id="cancel-delete-btn"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium rounded-lg text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            Cancel
          </button>
          <button
            id="confirm-delete-btn"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
