export default {
  messageQueue: {
    url: process.env.MESSAGE_QUEUE_URL || 'amqp://localhost:5672'
  },
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    leadScoringModel: process.env.LEAD_SCORING_MODEL || 'gpt-4',
    emailGenerationModel: process.env.EMAIL_GENERATION_MODEL || 'gpt-4',
    decisionMakingModel: process.env.DECISION_MAKING_MODEL || 'gpt-4'
  },
  crmSync: {
    intervalMs: parseInt(process.env.CRM_SYNC_INTERVAL_MS || '3600000', 10)  // Default: 1 hour
  },
  leadScoring: {
    batchSize: parseInt(process.env.LEAD_SCORING_BATCH_SIZE || '50', 10),
    batchIntervalMs: parseInt(process.env.LEAD_SCORING_INTERVAL_MS || '300000', 10), // Default: 5 minutes
    rescoreAfterMs: parseInt(process.env.LEAD_RESCORE_AFTER_MS || '86400000', 10), // Default: 24 hours
    defaultCriteria: {
      engagementWeight: 0.4,
      fitWeight: 0.3,
      intentWeight: 0.3,
      highScoreThreshold: 70
    }
  },
  campaigns: {
    checkIntervalMs: parseInt(process.env.CAMPAIGN_CHECK_INTERVAL_MS || '300000', 10) // Default: 5 minutes
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    apiKey: process.env.EMAIL_SERVICE_API_KEY || '',
    fromEmail: process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com',
    replyToEmail: process.env.DEFAULT_REPLY_TO_EMAIL || 'support@example.com'
  }
};
