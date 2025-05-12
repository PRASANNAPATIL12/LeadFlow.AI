import { Request, Response } from 'express';
import { UserService } from '@agentic-sales/database';
import { OrganizationService } from '@agentic-sales/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Logger } from '@agentic-sales/ai-engine';

export class UserController {
  private userService: UserService;
  private orgService: OrganizationService;
  private logger: Logger;
  
  constructor() {
    this.userService = new UserService();
    this.orgService = new OrganizationService();
    this.logger = new Logger('UserController');
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }
      
      const user = await this.userService.findByEmail(email);
      
      if (!user) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }
      
      if (!user.isActive) {
        res.status(401).json({ message: 'Account is deactivated' });
        return;
      }
      
      const isPasswordValid = await user.comparePassword(password);
      
      if (!isPasswordValid) {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }
      
      const organization = await this.orgService.findById(user.organizationId.toString());
      
      if (!organization || !organization.isActive) {
        res.status(401).json({ message: 'Organization is inactive' });
        return;
      }
      
      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      
      // Update last login time
      await this.userService.updateLastLogin(user._id.toString());
      
      res.status(200).json({
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
        }
      });
    } catch (error) {
      this.logger.error(`Error during login: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      
      const user = await this.userService.findById(userId);
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      res.status(200).json({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        lastLogin: user.lastLogin,
      });
    } catch (error) {
      this.logger.error(`Error fetching current user: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role, organizationId } = req.body;
      
      // Validate required fields
      if (!email || !password || !firstName || !lastName || !organizationId) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
      }
      
      // Check if email already exists
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        res.status(409).json({ message: 'Email already in use' });
        return;
      }
      
      // Verify organization exists
      const organization = await this.orgService.findById(organizationId);
      if (!organization) {
        res.status(404).json({ message: 'Organization not found' });
        return;
      }
      
      // Create new user
      const newUser = await this.userService.create({
        email,
        password,
        firstName,
        lastName,
        role: role || 'user',
        organizationId,
      });
      
      res.status(201).json({
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        organizationId: newUser.organizationId,
      });
    } catch (error) {
      this.logger.error(`Error creating user: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  // Additional controller methods would go here:
  // updateCurrentUser, updatePassword, getAllUsers,
  // getUserById, updateUser, deleteUser, etc.
  
  // For brevity, I'm showing implementation patterns rather than every method
  
  updateUserRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'manager', 'user'].includes(role)) {
        res.status(400).json({ message: 'Invalid role' });
        return;
      }
      
      const updatedUser = await this.userService.update(id, { role });
      
      if (!updatedUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      res.status(200).json({
        id: updatedUser._id,
        email: updatedUser.email,
        role: updatedUser.role,
      });
    } catch (error) {
      this.logger.error(`Error updating user role: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  
  toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        res.status(400).json({ message: 'isActive must be a boolean' });
        return;
      }
      
      const updatedUser = await this.userService.update(id, { isActive });
      
      if (!updatedUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      res.status(200).json({
        id: updatedUser._id,
        email: updatedUser.email,
        isActive: updatedUser.isActive,
      });
    } catch (error) {
      this.logger.error(`Error toggling user status: ${error}`);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    // Implementation omitted for brevity
    res.status(200).json({ message: 'Password reset email sent' });
  };
  
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    // Implementation omitted for brevity
    res.status(200).json({ message: 'Password reset successful' });
  };
}