#!/usr/bin/env node
// SMS Scheduler Cron Script
// Usage: node scripts/sms-cron.js (runs once) or via cron: 0 * * * * cd /path/to/PhysioFlow && node scripts/sms-cron.js

import { processScheduledSMS, getSMSStats } from '../server/services/smsScheduler.js';

console.log('⏰ SMS Scheduler started:', new Date().toISOString());

async function main() {
  try {
    const result = await processScheduledSMS();
    const stats = getSMSStats();
    
    console.log('✅ SMS processing complete');
    console.log(`   Sent: ${result.sent}, Failed: ${result.failed}`);
    console.log(`   Today's total: ${stats.sent} sent, ${stats.failed} failed, ${stats.scheduled} pending`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ SMS Scheduler error:', error);
    process.exit(1);
  }
}

main();
