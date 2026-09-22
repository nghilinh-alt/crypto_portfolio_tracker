import { create } from 'zustand';

export type TransactionType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW';

export type Transaction = {
  id: string;
  type: TransactionType;
  tokenId?: string;
  amount: number;
  price?: number;
  total: number;
  date: string;
  txHash?: string;
};

export type Target = {
  id: string;
  price: number;
  percentage: number;
  executed: boolean;
};

export type TokenStrategy = {
  sellTargets: Target[];
  rebuyTargets: Target[];
  notes?: string;
};

export type Token = {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  basePrice: number;
  price: number;
  lastReviewPrice: number;
  recentHigh: number;
  change24h: number;
  strategy: TokenStrategy;
};

type PortfolioState = {
  tokens: Token[];
  transactions: Transaction[];
  cashReserve: number;
  taxReserve: number;
  lastReviewedAt: string;
  
  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => void;
  updateTarget: (tokenId: string, targetType: 'sellTargets' | 'rebuyTargets', targetId: string, executed: boolean) => void;
  updateStrategy: (tokenId: string, strategy: TokenStrategy) => void;
  updateTokenBalance: (tokenId: string, newBalance: number) => void;
  completeWeeklyReview: () => void;
};

const initialTokens: Token[] = [
  {
    id: "eth",
    symbol: "ETH",
    name: "Ethereum",
    balance: 14.5,
    basePrice: 2800,
    price: 3450.20,
    lastReviewPrice: 3200,
    recentHigh: 3950,
    change24h: 2.4,
    strategy: {
      sellTargets: [
        { id: 's1', price: 4000, percentage: 10, executed: false },
        { id: 's2', price: 5000, percentage: 20, executed: false },
        { id: 's3', price: 6500, percentage: 25, executed: false },
      ],
      rebuyTargets: [
        { id: 'r1', price: 2800, percentage: 10, executed: true },
        { id: 'r2', price: 2200, percentage: 20, executed: false },
      ],
      notes: "Core holding. Bleed out slowly on the way up."
    }
  },
  {
    id: "tao",
    symbol: "TAO",
    name: "Bittensor",
    balance: 145.2,
    basePrice: 320,
    price: 450.75,
    lastReviewPrice: 485,
    recentHigh: 525,
    change24h: -5.2,
    strategy: {
      sellTargets: [
        { id: 's1', price: 600, percentage: 15, executed: false },
        { id: 's2', price: 850, percentage: 25, executed: false },
      ],
      rebuyTargets: [
        { id: 'r1', price: 350, percentage: 10, executed: false },
        { id: 'r2', price: 250, percentage: 30, executed: false },
      ]
    }
  },
  {
    id: "sui",
    symbol: "SUI",
    name: "Sui",
    balance: 24500,
    basePrice: 1.1,
    price: 1.45,
    lastReviewPrice: 1.3,
    recentHigh: 1.72,
    change24h: 12.5,
    strategy: {
      sellTargets: [
        { id: 's1', price: 2.0, percentage: 20, executed: false },
        { id: 's2', price: 3.5, percentage: 30, executed: false },
      ],
      rebuyTargets: [
        { id: 'r1', price: 1.0, percentage: 20, executed: false },
      ]
    }
  },
  {
    id: "morpho",
    symbol: "MORPHO",
    name: "Morpho",
    balance: 12400,
    basePrice: 1.35,
    price: 1.85,
    lastReviewPrice: 1.72,
    recentHigh: 2.1,
    change24h: 4.1,
    strategy: {
      sellTargets: [
        { id: 's1', price: 3.0, percentage: 25, executed: false },
        { id: 's2', price: 5.0, percentage: 50, executed: false },
      ],
      rebuyTargets: [
        { id: 'r1', price: 1.2, percentage: 20, executed: false },
      ]
    }
  },
  {
    id: "aave",
    symbol: "AAVE",
    name: "Aave",
    balance: 340,
    basePrice: 118,
    price: 135.4,
    lastReviewPrice: 141,
    recentHigh: 158,
    change24h: -1.2,
    strategy: {
      sellTargets: [
        { id: 's1', price: 200, percentage: 20, executed: false },
        { id: 's2', price: 350, percentage: 30, executed: false },
      ],
      rebuyTargets: [
        { id: 'r1', price: 90, percentage: 25, executed: false },
      ]
    }
  },
  {
    id: "ondo",
    symbol: "ONDO",
    name: "Ondo Finance",
    balance: 55000,
    basePrice: 0.7,
    price: 0.95,
    lastReviewPrice: 0.88,
    recentHigh: 1.12,
    change24h: 8.4,
    strategy: {
      sellTargets: [
        { id: 's1', price: 1.5, percentage: 25, executed: false },
        { id: 's2', price: 2.5, percentage: 25, executed: false },
      ],
      rebuyTargets: [
        { id: 'r1', price: 0.7, percentage: 20, executed: true },
        { id: 'r2', price: 0.5, percentage: 20, executed: false },
      ]
    }
  }
];

const initialTransactions: Transaction[] = [
  { id: 'tx1', type: 'BUY', tokenId: 'ondo', amount: 15000, price: 0.7, total: 10500, date: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'tx2', type: 'SELL', tokenId: 'eth', amount: 1.5, price: 3950, total: 5925, date: new Date(Date.now() - 86400000 * 12).toISOString() },
  { id: 'tx3', type: 'BUY', tokenId: 'sui', amount: 5000, price: 1.1, total: 5500, date: new Date(Date.now() - 86400000 * 18).toISOString() },
];

export const usePortfolioStore = create<PortfolioState>((set) => ({
  tokens: initialTokens,
  transactions: initialTransactions,
  cashReserve: 45000,
  taxReserve: 12500,
  lastReviewedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  
  addTransaction: (tx) => set((state) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx${Date.now()}`,
      date: new Date().toISOString(),
    };
    
    // Also update token balance if applicable
    let updatedTokens = state.tokens;
    let updatedCash = state.cashReserve;
    
    if (tx.tokenId) {
      updatedTokens = state.tokens.map(t => {
        if (t.id === tx.tokenId) {
          const newBalance = tx.type === 'BUY' ? t.balance + tx.amount : t.balance - tx.amount;
          return { ...t, balance: newBalance };
        }
        return t;
      });
    }
    
    if (tx.type === 'BUY') updatedCash -= tx.total;
    if (tx.type === 'SELL') updatedCash += tx.total;
    if (tx.type === 'DEPOSIT') updatedCash += tx.total;
    if (tx.type === 'WITHDRAW') updatedCash -= tx.total;

    return {
      transactions: [newTx, ...state.transactions],
      tokens: updatedTokens,
      cashReserve: updatedCash,
    };
  }),

  updateTarget: (tokenId, targetType, targetId, executed) => set((state) => ({
    tokens: state.tokens.map(t => {
      if (t.id !== tokenId) return t;
      return {
        ...t,
        strategy: {
          ...t.strategy,
          [targetType]: t.strategy[targetType].map((target: Target) => 
            target.id === targetId ? { ...target, executed } : target
          )
        }
      };
    })
  })),
  
  updateStrategy: (tokenId, strategy) => set((state) => ({
    tokens: state.tokens.map(t => t.id === tokenId ? { ...t, strategy } : t)
  })),

  updateTokenBalance: (tokenId, newBalance) => set((state) => ({
    tokens: state.tokens.map(t => t.id === tokenId ? { ...t, balance: newBalance } : t)
  })),

  completeWeeklyReview: () => set((state) => ({
    lastReviewedAt: new Date().toISOString(),
    tokens: state.tokens.map((token) => ({
      ...token,
      lastReviewPrice: token.price,
    })),
  })),
}));
