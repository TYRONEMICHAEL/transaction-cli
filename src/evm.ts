import fetch from "node-fetch";
import { Parser } from 'json2csv';
import fs from 'fs';

const apiKey = process.env.API_KEY || 'YOUR_API_KEY';
const apiUrl = "https://api.polygonscan.com/api";

async function fetchTransactions(address: string, endDate: Date, page: number = 1, transactions: any[] = [], retryCount: number = 0) {
  console.log('Preparing to fetch transactions...');
  const endTimestamp = Math.floor(endDate.getTime() / 1000);
  const url = `${apiUrl}?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=100&sort=desc&apikey=${apiKey}`;

  try {
    console.log('Sending request to:', url);
    const response = await fetch(url);
    console.log('Received response, processing...');
    const data: any = await response.json();
    
    if (data.status === '0') {
      console.error('Failed to fetch transactions:', data.result);
      throw new Error(`API error: ${data.result}`);
    }

    const validTransactions = data.result.map((tx: any) => ({
      blockNumber: tx.blockNumber,
      timeStamp: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(),
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      valueMatic: parseFloat(tx.value) / 1e18,
      type: tx.type,
      gas: tx.gas,
      gasUsed: tx.gasUsed,
      traceId: tx.traceId,
      isError: tx.isError === "0" ? "No" : "Yes",
      errCode: tx.errCode,
    }));

    console.log('Concatenating new transactions with previous ones...');
    transactions = transactions.concat(validTransactions);

    if (data.result.length === 0 || parseInt(data.result[data.result.length - 1].timeStamp) < endTimestamp) {
      console.log('All transactions fetched successfully.');
      return transactions;
    } else {
      console.log('Fetching next page of transactions...');
      return fetchTransactions(address, endDate, page + 1, transactions);
    }
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    if (retryCount < 5) {
      console.log(`Retrying... Attempt ${retryCount + 1}. Page ${page}`);
      await new Promise(resolve => setTimeout(resolve, 5000 * retryCount));  // Exponential back-off
      return fetchTransactions(address, endDate, page, transactions, retryCount + 1);
    } else {
      console.error(`Max retries reached. Continuing with what has been fetched so far. Page ${page}`);
      return transactions;  // Consider how you handle partial failure
    }
  }
}

async function main() {
  const address = process.env.ADDRESS || 'Your address';
  const endDate = new Date('2024-01-30');
  const results = await fetchTransactions(address, endDate);
  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(results);

  fs.writeFile('transactions-2.csv', csv, (err) => {
    if (err) throw err;
    console.log('CSV file has been saved.');
  });
}

main().catch(console.error);
