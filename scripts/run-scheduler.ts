#!/usr/bin/env npx ts-node
/**
 * Local development scheduler
 * Runs every minute and calls /api/scheduler
 * Usage: npx ts-node scripts/run-scheduler.ts
 */

import cron from 'node-cron';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local so CRON_SECRET and BASE_URL are available
config({ path: resolve(process.cwd(), '.env.local') });

const BASE_URL = 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '';

async function tick() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  if (CRON_SECRET) headers['Authorization'] = `Bearer ${CRON_SECRET}`;

  try {
    const res = await fetch(`${BASE_URL}/api/scheduler`, { headers });
    const data = await res.json();
    console.log(`[${new Date().toISOString()}] Scheduler tick:`, data);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Scheduler error:`, err);
  }
}

console.log('Starting local scheduler (every 60s)...');
console.log(`Hitting: ${BASE_URL}/api/scheduler`);

// Run immediately on start
tick();

// Then every minute
cron.schedule('* * * * *', tick);
