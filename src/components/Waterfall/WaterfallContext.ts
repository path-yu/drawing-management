import { createContext, useContext } from 'react';
import { WaterfallContextValue } from './types';

export const WaterfallContext = createContext<WaterfallContextValue | null>(null);

export function useWaterfallContext() {
  const context = useContext(WaterfallContext);
  if (!context) {
    throw new Error(
      'Waterfall.Item must be used within a Waterfall.Container component.'
    );
  }
  return context;
}
