import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App', () => {
  it('renders CoolSwap header', () => {
    render(<App />);
    const header = screen.getByRole('heading', { level: 1 });
    expect(header).toHaveTextContent('CoolSwap');
  });

  it('renders swap form with token and chain selectors', () => {
    render(<App />);
    expect(screen.getByText(/From \(Solana\)/i)).toBeInTheDocument();
    expect(screen.getByText(/To Chain/i)).toBeInTheDocument();
    // Swap button shows "Connect Wallet" when not connected
    expect(screen.getAllByText(/Connect Wallet/i).length).toBeGreaterThan(0);
  });
});
