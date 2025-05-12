import express from 'express';
import authRoutes from './auth.routes';
import leadRoutes from './lead.routes';
import contactRoutes from './contact.routes';
import companyRoutes from './company.routes';
import campaignRoutes from './campaign.routes';
import interactionRoutes from './interaction.routes';
import taskRoutes from './task.routes';
import userRoutes from './user.routes';
import integrationRoutes from './integration.routes';
import analyticsRoutes from './analytics.routes';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API version
router.get('/', (req, res) => {
  res.status(200).json({ 
    name: 'Agentic Sales Platform API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount route groups
router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/contacts', contactRoutes);
router.use('/companies', companyRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/interactions', interactionRoutes);
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);
router.use('/integrations', integrationRoutes);
router.use('/analytics', analyticsRoutes);

export default router;