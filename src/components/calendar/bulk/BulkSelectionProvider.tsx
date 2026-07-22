"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type BulkSelectionContextValue = {
  selectedIds: Set<string>;
  selectedCount: number;
  toggle: (eventId: string) => void;
  selectMany: (eventIds: string[]) => void;
  clear: () => void;
  isSelected: (eventId: string) => boolean;
};

const BulkSelectionContext = createContext<BulkSelectionContextValue | null>(null);

export function BulkSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((eventId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }, []);

  const selectMany = useCallback((eventIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of eventIds) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const value = useMemo(
    () => ({
      selectedIds,
      selectedCount: selectedIds.size,
      toggle,
      selectMany,
      clear,
      isSelected: (eventId: string) => selectedIds.has(eventId),
    }),
    [selectedIds, toggle, selectMany, clear],
  );

  return (
    <BulkSelectionContext.Provider value={value}>{children}</BulkSelectionContext.Provider>
  );
}

export function useBulkSelection() {
  const ctx = useContext(BulkSelectionContext);
  if (!ctx) {
    throw new Error("useBulkSelection requires BulkSelectionProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (returns no-op selection). */
export function useOptionalBulkSelection() {
  return useContext(BulkSelectionContext);
}
