import fetch from "node-fetch";

// API Key (Replace 'YOUR_API_KEY' with your actual Polygonscan API key)
const apiKey = process.env.API_KEY || 'YOUR API KEY';

// PolygonScan API URL
const apiUrl = "https://api.polygonscan.com/api";


async function fetchTransactions(address: string, endDate: Date, page: number = 1, transactions: any[] = []) {
  const endTimestamp = Math.floor(endDate.getTime() / 1000);

  const url = `${apiUrl}?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=10&sort=desc&apikey=${apiKey}`;

  try {
      const response = await fetch(url);
      const data = await response.json() as any;
      
      if (data.status === '0') {
        console.error('Failed to fetch transactions:', (data as any).result);
        return transactions;
      }

      // Filter transactions that are before the end date
      const validTransactions = data.result.filter((tx: any) => parseInt(tx.timeStamp) <= endTimestamp).map((tx: any) => ({
        blockNumber: tx.blockNumber,
        timeStamp: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(), // Convert Unix timestamp to a readable date
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        valueMatic: parseFloat(tx.value) / 1e18, // Convert wei to Matic
        type: tx.type,
        gas: tx.gas,
        gasUsed: tx.gasUsed,
        traceId: tx.traceId,
        isError: tx.isError === "0" ? "No" : "Yes", // Making isError more readable
        errCode: tx.errCode,
      }));

      // Concatenate new transactions with previous ones
      const allTransactions = transactions.concat(validTransactions);

      // Check if the last transaction is earlier than the end date or if there are no more transactions
      if (data.result.length === 0 || parseInt(data.result[data.result.length - 1].timeStamp) < endTimestamp) {
          return allTransactions;
      } else {
          // Recursive call to fetch next page
          return fetchTransactions(address, endDate, page + 1, allTransactions);
      }
  } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];  // You might want to handle this more gracefully
  }
}

// Example usage of the function

// Main function to execute the async functions
async function main() {
  const address = process.env.ADDRESS || 'Your address';
  const endDate = new Date('2024-04-01');  // Fetch transactions up to April 1, 2023
  const results = await fetchTransactions(address, endDate);
  console.log(results);
}

main().catch(console.error);
