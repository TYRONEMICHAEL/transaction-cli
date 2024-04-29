export interface TransactionDetails {
  transactionTime: string;
  transactionId: string;
  chain: 'Solana';
  amountInCrypto: {
    postBalances: number[];
    preBalances: number[];
    balanceDifferences: number[];
  };
  action: string;
}

export enum PassAction {
  Issue = 'Issue',
  Refresh = 'Refresh',
}

export type TransactionFetchResult = TransactionDetails[];