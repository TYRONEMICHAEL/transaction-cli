import { Connection, PublicKey, Commitment, ConfirmedTransaction, ConfirmedSignatureInfo } from '@solana/web3.js';
import { TransactionFetchResult, TransactionDetails, PassAction } from './types';

export async function getTransactionsInTimeRange(
  rpcUrl: string,
  address: string,
  startTime: Date,
  endTime: Date
): Promise<TransactionFetchResult> {
  const connection = new Connection(rpcUrl, 'confirmed' as Commitment);
  const walletPublicKey = new PublicKey(address);
  const startTimeSec = Math.floor(startTime.getTime() / 1000);
  const endTimeSec = Math.floor(endTime.getTime() / 1000);

  let lastSignature: string | undefined = undefined;
  let transactions: TransactionDetails[] = [];
  let iterationsWithoutRelevantTransactions = 0;

  while (true) {
    const options = { before: lastSignature, limit: 100 };
    const signatures = await connection.getConfirmedSignaturesForAddress2(walletPublicKey, options, 'confirmed');
    console.log(`Fetched ${signatures.length} transactions`);

    if (signatures.length === 0) {
      console.log('No more transactions found.');
      break;
    }

    let foundRelevantTransaction = false;

    for (const signatureInfo of signatures) {
      const transaction = await connection.getConfirmedTransaction(signatureInfo.signature, 'confirmed');
      if (transaction && transaction.blockTime) {
        if (transaction.blockTime < startTimeSec || transaction.blockTime > endTimeSec) {
          continue;
        }
        transactions.push(parseTransaction(signatureInfo.signature, transaction));
        foundRelevantTransaction = true;
      }
    }

    console.log(`Found ${transactions.length} relevant transactions`);

    if (!foundRelevantTransaction) {
      iterationsWithoutRelevantTransactions++;
      if (iterationsWithoutRelevantTransactions >= 5) {
        console.log('No relevant transactions found in the last 5 batches, stopping fetch.');
        break;
      }
    } else {
      iterationsWithoutRelevantTransactions = 0;
    }

    lastSignature = signatures[signatures.length - 1].signature;
    const lastTransactionTime = signatures[signatures.length - 1].blockTime;
    if (lastTransactionTime && lastTransactionTime > endTimeSec) {
      break;
    }
  }

  return transactions;
}

function parseTransaction(signature: string, transaction: ConfirmedTransaction): TransactionDetails {
  const action = transaction.meta?.logMessages?.some(log => log.includes(PassAction.Issue)) ? PassAction.Issue : PassAction.Refresh;
  const transactionTime = transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : '';

  const balanceDifferences = transaction.meta?.preBalances?.map((preBalance, index) => {
    const postBalance = transaction.meta?.postBalances[index] || 0; // Use 0 if no corresponding post balance
    return preBalance - postBalance; // Subtract post from pre
  }) || [];

  return {
    transactionTime: transactionTime,
    transactionId: signature,
    chain: 'Solana',
    amountInCrypto: {
      postBalances: transaction.meta?.postBalances || [],  
      preBalances: transaction.meta?.preBalances || [],
      balanceDifferences,
    },
    action: action
  };
}
