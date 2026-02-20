"use client";

import { createContext, useContext, ReactNode, useCallback, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { swrConfig } from "../lib/swrConfig";

interface SavedItemsContextType {
  savedItems: string[];
  savedCount: number;
  isLoading: boolean;
  addSavedItem: (itemId: string) => Promise<boolean>;
  removeSavedItem: (itemId: string) => Promise<boolean>;
  isItemSaved: (itemId: string) => boolean;
  toggleSavedItem: (itemId: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const SavedItemsContext = createContext<SavedItemsContextType | undefined>(undefined);

interface SavedItemsProviderProps {
  children: ReactNode;
}

async function fetchSavedBusinessIds(url: string): Promise<string[]> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    if (response.status === 401) return [];
    throw new Error(`Failed to fetch saved items (${response.status})`);
  }
  const data = await response.json();
  return (data.businesses || []).map((b: any) => b.id);
}

export function SavedItemsProvider({ children }: SavedItemsProviderProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const swrKey = user ? '/api/saved/businesses?limit=100' : null;
  const { data, isLoading, mutate } = useSWR(swrKey, fetchSavedBusinessIds, {
    ...swrConfig,
    onError: (err) => {
      const msg = err?.message || '';
      if (!msg.includes('401')) {
        console.warn('Error fetching saved items (non-critical):', msg);
      }
    },
  });

  const savedItems = data ?? [];

  const addSavedItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!user) {
      showToast('Please log in to save businesses', 'sage', 3000);
      return false;
    }

    // Optimistic add
    mutate(prev => (prev?.includes(itemId) ? prev : [...(prev ?? []), itemId]), { revalidate: false });

    try {
      const response = await fetch('/api/saved/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: itemId }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save business';
        try {
          const error = await response.json();
          errorMessage = error.error || error.details || error.message || errorMessage;
          if (
            error.code === '42P01' || error.code === '42501' ||
            errorMessage.toLowerCase().includes('relation') ||
            errorMessage.toLowerCase().includes('does not exist') ||
            errorMessage.toLowerCase().includes('permission denied') ||
            errorMessage.toLowerCase().includes('row-level security')
          ) {
            errorMessage = 'Saved businesses feature is not available. Please contact support.';
          }
        } catch {
          errorMessage = `Failed to save business (${response.status})`;
        }
        // Roll back
        mutate(prev => prev?.filter(id => id !== itemId) ?? [], { revalidate: false });
        showToast(errorMessage, 'sage', 4000);
        return false;
      }

      showToast('✨ Business saved! Check your saved items to view it.', 'success', 4500);
      mutate(); // background revalidation
      // Invalidate saved/page.tsx full list
      if (user?.id) globalMutate(['/api/user/saved', user.id]);
      return true;
    } catch (error) {
      console.error('Error saving business:', error);
      // Roll back
      mutate(prev => prev?.filter(id => id !== itemId) ?? [], { revalidate: false });
      showToast('Failed to save business. Please try again.', 'sage', 3000);
      return false;
    }
  }, [user, showToast, mutate]);

  const removeSavedItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!user) return false;

    // Optimistic remove
    mutate(prev => prev?.filter(id => id !== itemId) ?? [], { revalidate: false });

    try {
      const response = await fetch(`/api/saved/businesses/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        // Roll back
        mutate(prev => (prev?.includes(itemId) ? prev : [...(prev ?? []), itemId]), { revalidate: false });
        showToast(error.error || 'Failed to unsave business', 'sage', 3000);
        return false;
      }

      showToast('Business removed from saved', 'success', 3000);
      mutate(); // background revalidation
      // Invalidate saved/page.tsx full list
      if (user?.id) globalMutate(['/api/user/saved', user.id]);
      return true;
    } catch (error) {
      console.error('Error unsaving business:', error);
      // Roll back
      mutate(prev => (prev?.includes(itemId) ? prev : [...(prev ?? []), itemId]), { revalidate: false });
      showToast('Failed to unsave business. Please try again.', 'sage', 3000);
      return false;
    }
  }, [user, showToast, mutate]);

  const isItemSaved = useCallback((itemId: string) => savedItems.includes(itemId), [savedItems]);

  const toggleSavedItem = useCallback(async (itemId: string): Promise<boolean> => {
    return isItemSaved(itemId) ? removeSavedItem(itemId) : addSavedItem(itemId);
  }, [isItemSaved, removeSavedItem, addSavedItem]);

  const savedCount = useMemo(() => savedItems.length, [savedItems]);

  const value: SavedItemsContextType = useMemo(() => ({
    savedItems,
    savedCount,
    isLoading,
    addSavedItem,
    removeSavedItem,
    isItemSaved,
    toggleSavedItem,
    refetch: async () => { await mutate(); },
  }), [savedItems, savedCount, isLoading, addSavedItem, removeSavedItem, isItemSaved, toggleSavedItem, mutate]);

  return (
    <SavedItemsContext.Provider value={value}>
      {children}
    </SavedItemsContext.Provider>
  );
}

export function useSavedItems() {
  const context = useContext(SavedItemsContext);
  if (context === undefined) {
    throw new Error("useSavedItems must be used within a SavedItemsProvider");
  }
  return context;
}
