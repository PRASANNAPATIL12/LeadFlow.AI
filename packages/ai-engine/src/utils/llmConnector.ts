import axios, { AxiosInstance } from 'axios';
import { Logger } from './logger';

export class LLMConnector {
  private apiKey: string;
  private apiUrl: string;
  private client: AxiosInstance;
  private logger: Logger;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    this.logger = new Logger('LLMConnector');
  }

  async complete(prompt: string, flow: string, model: string = 'gpt-3.5-turbo'): Promise<string> {
    try {
      const response = await this.client.post('', {
        model: model,
        messages: [{
          role: 'user',
          content: prompt,
        }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      this.logger.info(`LLM completed prompt for ${flow}`);
      return response.data.choices[0].message.content;
    } catch (error: any) {
      this.logger.error(`LLM completion failed for ${flow}: ${error.message}`);
      throw new Error(`LLM completion failed: ${error.message}`);
    }
  }
}
