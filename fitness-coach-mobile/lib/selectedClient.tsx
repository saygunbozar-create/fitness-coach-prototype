import { createContext, ReactNode, useContext, useState } from 'react';

type SelectedClientState = {
  selectedClientId: string | null;
  setSelectedClientId: (id: string) => void;
};

const SelectedClientContext = createContext<SelectedClientState | null>(null);

export function SelectedClientProvider({ children }: { children: ReactNode }) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  return (
    <SelectedClientContext.Provider value={{ selectedClientId, setSelectedClientId }}>
      {children}
    </SelectedClientContext.Provider>
  );
}

export function useSelectedClient() {
  const ctx = useContext(SelectedClientContext);
  if (!ctx) throw new Error('useSelectedClient must be used within SelectedClientProvider');
  return ctx;
}
