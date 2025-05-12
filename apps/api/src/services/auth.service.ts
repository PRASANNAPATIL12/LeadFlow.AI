import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../../../../packages/database/src/models/user.model';
import { Organization } from '../../../../packages/database/src/models/organization.model';
import { Logger } from '../../../../packages/ai-engine/src/utils/logger';

interface TokenPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
}

interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export class AuthService {
  private logger: Logger;
  private config: AuthConfig;
  
  constructor(config: AuthConfig) {
    this.logger = new Logger('AuthService');
    this.config = config;
  }
  
  /**
   * Register a new user
   */
  async registerUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    organizationName?: string
  ): Promise<{ user: any; organization: any; tokens: { accessToken: string; refreshToken: string } }> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      
      if (existingUser) {
        throw new Error('User with this email already exists');
      }
      
      // Create organization if provided
      let organization: any;
      if (organizationName) {
        organization = await Organization.create({
          name: organizationName,
          status: 'active'
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: organization ? 'admin' : 'user',
        organizationId: organization?.id,
        status: 'active'
      });
      
      // Generate tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        organizationId: organization?.id || '',
        role: user.role
      });
      
      this.logger.info(`User registered: ${email}`);
      
      return {
        user: user.toJSON(),
        organization: organization?.toJSON(),
        tokens
      };
    } catch (error) {
      this.logger.error('Error registering user:', error);
      throw error;
    }
  }
  
  /**
   * Login a user
   */
  async loginUser(
    email: string,
    password: string
  ): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    try {
      // Find user
      const user = await User.findOne({
        where: { email },
        include: [{ model: Organization, as: 'organization' }]
      });
      
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Check if user is active
      if (user.status !== 'active') {
        throw new Error('User account is not active');
      }
      
      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      
      if (!passwordValid) {
        throw new Error('Invalid email or password');
      }
      
      // Generate tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId || '',
        role: user.role
      });
      
      this.logger.info(`User logged in: ${email}`);
      
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId: user.organizationId,
          organization: user.organization
        },
        tokens
      };
    } catch (error) {
      this.logger.error('Error logging in user:', error);
      throw error;
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.config.jwtSecret) as TokenPayload;
      
      // Find user
      const user = await User.findByPk(decoded.userId);
      
      if (!user || user.status !== 'active') {
        throw new Error('Invalid refresh token');
      }
      
      // Generate new tokens
      return this.generateTokens({
        userId: user.id,
        email: user.email,
        organizationId: user.organizationId || '',
        role: user.role
      });
    } catch (error) {
      this.logger.error('Error refreshing token:', error);
      throw error;
    }
  }
  
  /**
   * Verify access token
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.config.jwtSecret) as TokenPayload;
    } catch (error) {
      this.logger.error('Error verifying token:', error);
      throw new Error('Invalid token');
    }
  }
  
  /**
   * Generate access and refresh tokens
   */
  private generateTokens(payload: TokenPayload): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn
    });
    
    const refreshToken = jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.refreshTokenExpiresIn
    });
    
    return { accessToken, refreshToken };
  }
  
  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Find user
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Verify current password
      const passwordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!passwordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await user.update({ password: hashedPassword });
      
      this.logger.info(`Password changed for user ${userId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error changing password for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Reset password (generate token)
   */
  async requestPasswordReset(email: string): Promise<string> {
    try {
      // Find user
      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email },
        this.config.jwtSecret,
        { expiresIn: '1h' }
      );
      
      this.logger.info(`Password reset requested for ${email}`);
      
      return resetToken;
    } catch (error) {
      this.logger.error(`Error requesting password reset for ${email}:`, error);
      throw error;
    }
  }
  
  /**
   * Reset password (with token)
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<boolean> {
    try {
      // Verify reset token
      const decoded = jwt.verify(resetToken, this.config.jwtSecret) as { userId: string; email: string };
      
      // Find user
      const user = await User.findByPk(decoded.userId);
      
      if (!user || user.email !== decoded.email) {
        throw new Error('Invalid reset token');
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await user.update({ password: hashedPassword });
      
      this.logger.info(`Password reset for user ${decoded.userId}`);
      
      return true;
    } catch (error) {
      this.logger.error('Error resetting password:', error);
      throw error;
    }
  }
}
