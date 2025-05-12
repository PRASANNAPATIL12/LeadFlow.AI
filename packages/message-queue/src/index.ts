import * as amqp from 'amqplib';
import { Logger } from '../../ai-engine/src/utils/logger';

export class MessageQueue {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private url: string;
  private logger: Logger;
  private subscriptions: Map<string, (message: any) => Promise<void>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectInterval: number = 5000; // 5 seconds

  constructor(url: string) {
    this.url = url;
    this.logger = new Logger('MessageQueue');
  }

  async connect(): Promise<void> {
    try {
      this.logger.info(`Connecting to message queue at ${this.url}`);
      this.connection = await amqp.connect(this.url);
      
      this.connection.on('error', (err) => {
        this.logger.error('Connection error', err);
        this.scheduleReconnect();
      });
      
      this.connection.on('close', () => {
        this.logger.warn('Connection closed');
        this.scheduleReconnect();
      });
      
      this.channel = await this.connection.createChannel();
      this.logger.info('Connected to message queue');
      
      // Reset reconnect attempts on successful connection
      this.reconnectAttempts = 0;
      
      // Re-establish subscriptions if any
      if (this.subscriptions.size > 0) {
        for (const [queue, callback] of this.subscriptions.entries()) {
          await this.setupQueue(queue, callback);
        }
      }
    } catch (error) {
      this.logger.error('Failed to connect to message queue', error);
      this.scheduleReconnect();
      throw error;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      this.logger.error(`Exceeded maximum reconnect attempts (${this.maxReconnectAttempts})`);
      return;
    }
    
    const delay = this.reconnectInterval * Math.min(Math.pow(2, this.reconnectAttempts - 1), 30);
    this.logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Error handling already done in connect()
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      
      this.logger.info('Disconnected from message queue');
    } catch (error) {
      this.logger.error('Error disconnecting from message queue', error);
      throw error;
    }
  }

  async publish(queue: string, message: any): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('Not connected to message queue');
      }
      
      await this.channel.assertQueue(queue, { durable: true });
      const content = Buffer.from(JSON.stringify(message));
      
      this.channel.sendToQueue(queue, content, {
        persistent: true,
        timestamp: Date.now(),
        contentType: 'application/json'
      });
      
      this.logger.debug(`Published message to ${queue}`);
    } catch (error) {
      this.logger.error(`Error publishing message to ${queue}`, error);
      throw error;
    }
  }

  async subscribe(queue: string, callback: (message: any) => Promise<void>): Promise<void> {
    try {
      this.subscriptions.set(queue, callback);
      
      if (!this.channel) {
        this.logger.warn(`Not connected to message queue. Subscription to ${queue} will be applied after reconnection`);
        return;
      }
      
      await this.setupQueue(queue, callback);
      this.logger.info(`Subscribed to queue ${queue}`);
    } catch (error) {
      this.logger.error(`Error subscribing to queue ${queue}`, error);
      throw error;
    }
  }

  private async setupQueue(queue: string, callback: (message: any) => Promise<void>): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to message queue');
    }
    
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.prefetch(1);
    
    this.channel.consume(queue, async (msg) => {
      if (!msg) return;
      
      try {
        const content = JSON.parse(msg.content.toString());
        this.logger.debug(`Received message from ${queue}`);
        
        await callback(content);
        this.channel?.ack(msg);
      } catch (error) {
        this.logger.error(`Error processing message from ${queue}`, error);
        // Nack the message and requeue
        this.channel?.nack(msg, false, true);
      }
    });
  }

  async unsubscribe(queue: string): Promise<void> {
    try {
      this.subscriptions.delete(queue);
      
      if (!this.channel) {
        this.logger.warn(`Not connected to message queue. No active subscription to ${queue} to cancel`);
        return;
      }
      
      await this.channel.cancel(queue);
      this.logger.info(`Unsubscribed from queue ${queue}`);
    } catch (error) {
      this.logger.error(`Error unsubscribing from queue ${queue}`, error);
      throw error;
    }
  }
}
