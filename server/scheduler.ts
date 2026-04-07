import cron from 'node-cron';
import { runSourcingEngine } from './sourcing';

export function startScheduler() {
  // Run at 2am every day
  cron.schedule('0 2 * * *', async () => {
    console.log('[Scheduler] Starting daily sourcing run...');
    await runSourcingEngine();
  });
  console.log('[Scheduler] Daily sourcing scheduled at 2am');
}
