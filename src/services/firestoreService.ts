import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { JournalEntry, Turn } from '../types';

export const subscribeToUserEntries = (
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
) => {
  if (!userId) return () => {};

  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          userId: data.userId || userId,
          title: data.title || 'Untitled Reflection',
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
          turns: Array.isArray(data.turns) ? data.turns : [],
          summary: data.summary,
          takeaways: data.takeaways || [],
          mood: data.mood,
          tags: data.tags || [],
          isPinned: Boolean(data.isPinned),
          reflectionMode: data.reflectionMode || 'socratic',
        });
      });
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore subscription error:', err);
      if (onError) onError(err);
    }
  );
};

export const createJournalEntry = async (
  userId: string,
  entryData: Partial<JournalEntry>
): Promise<string> => {
  if (!userId) throw new Error('User ID is required');

  const entriesRef = collection(db, 'users', userId, 'entries');
  const newDocRef = doc(entriesRef);
  const now = Date.now();

  const newEntry: JournalEntry = {
    id: newDocRef.id,
    userId,
    title: entryData.title || 'New Reflection',
    createdAt: entryData.createdAt || now,
    updatedAt: entryData.updatedAt || now,
    turns: entryData.turns || [],
    summary: entryData.summary || '',
    takeaways: entryData.takeaways || [],
    mood: entryData.mood || '',
    tags: entryData.tags || [],
    isPinned: Boolean(entryData.isPinned),
    reflectionMode: entryData.reflectionMode || 'socratic',
  };

  await setDoc(newDocRef, newEntry);
  return newDocRef.id;
};

export const updateJournalEntry = async (
  userId: string,
  entryId: string,
  updates: Partial<JournalEntry>
): Promise<void> => {
  if (!userId || !entryId) throw new Error('User ID and Entry ID are required');

  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await updateDoc(entryRef, {
    ...updates,
    updatedAt: Date.now(),
  });
};

export const deleteJournalEntry = async (
  userId: string,
  entryId: string
): Promise<void> => {
  if (!userId || !entryId) throw new Error('User ID and Entry ID are required');

  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
};

export const addTurnToEntry = async (
  userId: string,
  entryId: string,
  turns: Turn[],
  additionalUpdates?: Partial<JournalEntry>
): Promise<void> => {
  if (!userId || !entryId) throw new Error('User ID and Entry ID are required');

  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await updateDoc(entryRef, {
    turns,
    updatedAt: Date.now(),
    ...(additionalUpdates || {}),
  });
};
