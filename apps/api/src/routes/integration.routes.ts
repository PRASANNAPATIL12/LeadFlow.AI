import express from 'express';
import { IntegrationController } from '../controllers/integration.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = express.Router();
const integrationController = new IntegrationController();

// All routes require authentication
router.use(authMiddleware);

// Get all integrations for current organization
router.get('/', integrationController.getIntegrations);

// Get a specific integration
router.get('/:id', integrationController.getIntegrationById);

// Routes for organization admins only
router.use(roleMiddleware(['admin']));
router.post('/', integrationController.createIntegration);
router.put('/:id', integrationController.updateIntegration);
router.delete('/:id', integrationController.deleteIntegration);

// Integration status management
router.put('/:id/status', integrationController.updateIntegrationStatus);

// Integration credentials management
router.put('/:id/credentials', integrationController.updateIntegrationCredentials);

// Integration webhooks
router.post('/webhook/:type', integrationController.handleWebhook);

export default router;