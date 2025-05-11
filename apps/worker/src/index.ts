import { crmSyncWorker } from './jobs/crmSyncWorker';
import { leadScoringWorker } from './jobs/leadScoringWorker';
import { emailCampaignWorker } from './jobs/emailCampaignWorker';

// Initialize workers
crmSyncWorker.init();
leadScoringWorker.init();
emailCampaignWorker.init();

console.log('Workers initialized and running');

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down workers');
});
