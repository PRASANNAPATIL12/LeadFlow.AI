import express from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();
const analyticsController = new AnalyticsController();

// All routes require authentication
router.use(authMiddleware);

// Dashboard analytics
router.get('/dashboard', analyticsController.getDashboardMetrics);

// Lead analytics
router.get('/leads', analyticsController.getLeadMetrics);
router.get('/leads/conversion', analyticsController.getLeadConversionMetrics);
router.get('/leads/sources', analyticsController.getLeadSourceMetrics);

// Campaign analytics
router.get('/campaigns', analyticsController.getCampaignMetrics);
router.get('/campaigns/:id', analyticsController.getCampaignById);

// AI agent analytics
router.get('/agents/performance', analyticsController.getAgentPerformanceMetrics);
router.get('/agents/decisions', analyticsController.getAgentDecisionMetrics);

// Custom date range analytics
router.post('/custom', analyticsController.getCustomRangeMetrics);

// Export analytics data
router.get('/export/:type', analyticsController.exportAnalyticsData);

export default router;