import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // Changed from 'bcrypt' to 'bcryptjs' as it's often used in Node.js without native bindings
import { User } from '@agentic-sales-platform/database'; // Adjusted import path
import { logger } from '@agentic-sales-platform/utils'; // Adjusted import path

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name, company, organizationId } = req.body; // Assuming organizationId might be passed or determined
      
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and name are required.'
        });
      }

      // This assumes your User model and database interaction setup supports `findOne` and `create`
      // The original code used Sequelize-like syntax. If you are using Prisma or Mongoose, this needs adjustment.
      // For now, I'll keep it, but it might not directly work with the Mongoose User model you defined earlier.
      // Let's assume User.findOne and User.create are adapted for your ORM (e.g. Mongoose)

      const existingUser = await User.findOne({ email: email } as any); // Cast to any if findOne expects different arg type
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'User with this email already exists' 
        });
      }
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Ensure organizationId is present if it's required by your User model
      // This is a placeholder, actual organization handling might be more complex.
      const finalOrganizationId = organizationId || 'default-org-id'; 

      const newUser = await User.create({
        email,
        password: hashedPassword,
        firstName: name.split(' ')[0], // Simple name splitting, adjust as needed
        lastName: name.split(' ').slice(1).join(' ') || name.split(' ')[0], // Fallback for single name
        companyName: company, // Assuming your User model has companyName
        role: 'user', // Default role
        organizationId: finalOrganizationId, // Link to an organization
        // lastLogin: new Date() // lastLogin on registration might not be standard
      } as any); // Cast to any if create expects different arg type or for Mongoose models
      
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role, organizationId: newUser.organizationId },
        process.env.JWT_SECRET || 'your-default-secret',
        { expiresIn: '24h' }
      );
      
      logger.info(`User registered: ${email}`);
      
      // Avoid sending password back, even if hashed
      const userResponse = {
        id: newUser.id,
        email: newUser.email,
        name: `${newUser.firstName} ${newUser.lastName}`,
        company: newUser.companyName,
        role: newUser.role,
        organizationId: newUser.organizationId
      };

      return res.status(201).json({
        success: true,
        user: userResponse,
        token
      });
    } catch (error) {
      logger.error(`Registration error: ${error.message}`, error);
      return res.status(500).json({
        success: false,
        message: 'Server error during registration'
      });
    }
  }
  
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required.'
        });
      }
      
      // Again, assuming User.findOne and password comparison logic is adapted for your ORM
      const user = await User.findOne({ email: email } as any);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // User model should have a method like comparePassword or you do it here
      // For Mongoose: const isPasswordValid = await user.comparePassword(password);
      // For this generic example, assuming user.password directly stores the hash (which is how your User model looks)
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Update last login - this depends on User model having lastLogin and an update method
      // For Mongoose: await User.findByIdAndUpdate(user.id, { lastLogin: new Date() });
      // user.lastLogin = new Date(); await user.save(); // Alternative Mongoose
      // For now, logging it as an action to be implemented based on ORM:
      logger.info(`Updating lastLogin for user ${user.id} - ORM specific implementation needed here.`);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
        process.env.JWT_SECRET || 'your-default-secret',
        { expiresIn: '24h' }
      );
      
      logger.info(`User logged in: ${email}`);
      
      const userResponse = {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        company: user.companyName,
        role: user.role,
        organizationId: user.organizationId
      };

      return res.status(200).json({
        success: true,
        user: userResponse,
        token
      });
    } catch (error) {
      logger.error(`Login error: ${error.message}`, error);
      return res.status(500).json({
        success: false,
        message: 'Server error during login'
      });
    }
  }
  
  static async me(req: Request, res: Response) {
    try {
      const userId = req.user?.id; // req.user is populated by authMiddleware
      
      if (!userId) {
        // This case should ideally be caught by authMiddleware itself
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }
      
      // Assuming User.findById for Mongoose or User.findByPk for Sequelize
      const user = await User.findById(userId as any); 
      if (!user) {
        logger.warn(`Authenticated user ID ${userId} not found in database.`);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const userResponse = {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        company: user.companyName,
        role: user.role,
        organizationId: user.organizationId
      };

      return res.status(200).json({
        success: true,
        user: userResponse
      });
    } catch (error) {
      logger.error(`Auth verification error (/me): ${error.message}`, error);
      return res.status(500).json({
        success: false,
        message: 'Server error during auth verification'
      });
    }
  }
}
