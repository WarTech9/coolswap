import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';
import type { Quote } from '../services/bridge/types';

interface SwapState {
  sourceToken: string | null;
  destinationChain: string | null;
  destinationToken: string | null;
  amount: string;
  recipientAddress: string;
  quote: Quote | null;
  status:
    | 'idle'
    | 'loading'
    | 'quoted'
    | 'signing'
    | 'confirming'
    | 'completed'
    | 'error';
  error: string | null;
}

type SwapAction =
  | { type: 'SET_SOURCE_TOKEN'; payload: string }
  | { type: 'SET_DESTINATION_CHAIN'; payload: string }
  | { type: 'SET_DESTINATION_TOKEN'; payload: string }
  | { type: 'SET_AMOUNT'; payload: string }
  | { type: 'SET_RECIPIENT'; payload: string }
  | { type: 'SET_QUOTE'; payload: Quote }
  | { type: 'SET_STATUS'; payload: SwapState['status'] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };

// Validate amount input: allow empty string or valid decimal numbers
// Must have at least one digit (rejects standalone ".")
// Exported for testing
export function isValidAmount(value: string): boolean {
  if (value === '') return true;
  return /^\d+\.?\d*$|^\d*\.?\d+$/.test(value);
}

const initialState: SwapState = {
  sourceToken: null,
  destinationChain: null,
  destinationToken: null,
  amount: '',
  recipientAddress: '',
  quote: null,
  status: 'idle',
  error: null,
};

// Exported for testing
export function swapReducer(state: SwapState, action: SwapAction): SwapState {
  switch (action.type) {
    case 'SET_SOURCE_TOKEN':
      return { ...state, sourceToken: action.payload, quote: null };
    case 'SET_DESTINATION_CHAIN':
      return {
        ...state,
        destinationChain: action.payload,
        destinationToken: null,
        quote: null,
      };
    case 'SET_DESTINATION_TOKEN':
      return { ...state, destinationToken: action.payload, quote: null };
    case 'SET_AMOUNT':
      if (!isValidAmount(action.payload)) return state;
      return { ...state, amount: action.payload, quote: null };
    case 'SET_RECIPIENT':
      return { ...state, recipientAddress: action.payload };
    case 'SET_QUOTE':
      return { ...state, quote: action.payload, status: 'quoted' };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, status: 'error', quote: null };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface SwapContextType {
  state: SwapState;
  dispatch: Dispatch<SwapAction>;
}

const SwapContext = createContext<SwapContextType | undefined>(undefined);

export function SwapProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(swapReducer, initialState);

  return (
    <SwapContext.Provider value={{ state, dispatch }}>
      {children}
    </SwapContext.Provider>
  );
}

export function useSwapContext() {
  const context = useContext(SwapContext);
  if (!context) {
    throw new Error('useSwapContext must be used within SwapProvider');
  }
  return context;
}
