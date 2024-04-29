// Assuming your getTransactionsInTimeRange is adapted for modular import and usage.

import { TextEncoder } from 'util'; // Available globally in modern Node.js environments
import { getTransactionsInTimeRange } from './solana';

export const config = {
  runtime: 'edge'
};

export async function GET() {
  const encoder = new TextEncoder();
  const rpcUrl = '...';  // Your actual RPC URL here
  const address = '...';
  const startTime = new Date('2024-04-24');
  const endTime = new Date('2024-04-24');

  const customReadable = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('Starting to fetch transactions...\n'));

      try {
        const transactions = await getTransactionsInTimeRange(rpcUrl, address, startTime, endTime);

        // Assume transactions is an array and can be serialized
        transactions.forEach((transaction: any) => {
          controller.enqueue(encoder.encode(JSON.stringify(transaction) + '\n'));
        });

        controller.enqueue(encoder.encode('All transactions fetched.\n'));
      } catch (error) {
        controller.enqueue(encoder.encode('An error occurred: ' + JSON.stringify(error) + '\n'));
      }
      
      controller.close();
    }
  });

  return new Response(customReadable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}
