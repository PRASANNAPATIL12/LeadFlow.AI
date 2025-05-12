import express from 'express';
import { OrganizationController } from '../controllers/organization.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = express.Router();
const organizationController = new OrganizationController();

// All routes require authentication
router.use(authMiddleware);

// Routes for organization admins and managers
router.get('/current', organizationController.getCurrentOrganization);
router.put('/current', roleMiddleware(['admin', 'manager']), organizationController.updateCurrentOrganization);
router.get('/current/settings', organizationController.getOrganizationSettings);
router.put('/current/settings', roleMiddleware(['admin']), organizationController.updateOrganizationSettings);
router.post('/current/regenerate-api-key', roleMiddleware(['admin']), organizationController.regenerateApiKey);

// Super admin routes
router.use(roleMiddleware(['admin']));
router.get('/', organizationController.getAllOrganizations);
router.post('/', organizationController.createOrganization);
router.get('/:id', organizationController.getOrganizationById);
router.put('/:id', organizationController.updateOrganization);
router.delete('/:id', organizationController.deleteOrganization);
router.put('/:id/status', organizationController.toggleOrganizationStatus);

export default router;