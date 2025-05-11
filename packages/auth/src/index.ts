import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
// Assuming Logger is in packages/ai-engine/src/utils/logger.ts relative to the root
// Adjust the import path if Logger is located elsewhere or if your tsconfig paths handle this.
import { Logger } from '../../ai-engine/src/utils/logger'; 

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'sales';
  password?: string; // Password might not always be present, e.g., when fetching user data
  organizationId: string; // Assuming this will be linked to an Organization model
  // Add other relevant user fields here
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string;
}

export class AuthService {
  private logger: Logger;
  private jwtSecret: string;
  private tokenExpiry: string;

  constructor(jwtSecret: string, tokenExpiry: string = '1h') {
    this.logger = new Logger('AuthService');
    this.jwtSecret = jwtSecret;
    this.tokenExpiry = tokenExpiry;
    if (!jwtSecret) {
      this.logger.warn('JWT_SECRET is not set. Authentication will not be secure.');
      this.jwtSecret = 'default-unsafe-secret'; // Fallback for local dev, NOT FOR PRODUCTION
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.tokenExpiry });
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as TokenPayload;
    } catch (error) {
      this.logger.error('Invalid token:', error);
      return null;
    }
  }

  // Placeholder for user creation logic - this would interact with your database package
  async register(userData: Omit<User, 'id'>): Promise<User | null> {
    this.logger.info(`Registering user: ${userData.email}`);
    // In a real app, you would:
    // 1. Check if user already exists
    // 2. Hash the password: const hashedPassword = await this.hashPassword(userData.password);
    // 3. Save user to database with hashedPassword
    // 4. Return the created user (without password)
    const newUser: User = {
      id: uuidv4(),
      ...userData,
    };
    // Simulate password hashing and removal for the returned object
    delete newUser.password; 
    return newUser; 
  }

  // Placeholder for login logic - this would interact with your database package
  async login(email: string,password: string): Promise<{ user: User; token: string } | null> {
    this.logger.info(`Login attempt for user: ${email}`);
    // In a real app, you would:
    // 1. Find user by email in the database
    // 2. If user exists, compare password: constisValid = await this.comparePassword(password, user.passwordHashFromDB);
    // 3. If valid, generate and return token
    // This is a mock implementation:
    const mockUser: User = {
      id: uuidv4(),
      email: email,
      name: 'Mock User',
      role: 'sales',
      organizationId: uuidv4(),
    };
    // Simulate password check (always true for mock)
    const isValidPassword = true; 

    if (isValidPassword) {
      const token = this.generateToken(mockUser);
      return { user: mockUser, token };
    }
    return null;
  }
}
