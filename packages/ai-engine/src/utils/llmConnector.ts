import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './logger';

// Define supported LLM providers
export type LLMProvider = 'openai' | 'anthropic' | 'local' | 'google'; // Added google

interface LLMOptions {
  provider?: LLMProvider; // Made provider optional to use default
  modelName?: string;    // Made modelName optional 
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}

export class LLMConnector {
  private options: Required<Omit<LLMOptions, 'apiKey' | 'baseUrl'>> & Pick<LLMOptions, 'apiKey' | 'baseUrl'>;
  private logger: Logger;
  
  constructor(options: LLMOptions = {}) {
    const defaultProvider: LLMProvider = process.env.DEFAULT_LLM_PROVIDER as LLMProvider || 'anthropic';
    const defaultModel = (provider: LLMProvider) => {
        switch(provider) {
            case 'openai': return process.env.OPENAI_MODEL_NAME || 'gpt-4o';
            case 'anthropic': return process.env.ANTHROPIC_MODEL_NAME || 'claude-3-sonnet-20240229';
            case 'google': return process.env.GOOGLE_MODEL_NAME || 'gemini-pro'; // Example model
            case 'local': return process.env.LOCAL_MODEL_NAME || 'llama2'; // Example model
            default: return 'claude-3-sonnet-20240229';
        }
    }

    this.options = {
      provider: options.provider || defaultProvider,
      modelName: options.modelName || defaultModel(options.provider || defaultProvider),
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
      apiKey: options.apiKey, // Will be undefined if not provided, specific methods handle env vars
      baseUrl: options.baseUrl, // Will be undefined if not provided, specific methods handle defaults
    };
    this.logger = new Logger('LLMConnector');
  }
  
  async complete(prompt: string, customOptions?: Partial<LLMOptions>): Promise<string> {
    const activeOptions = { ...this.options, ...customOptions };    
    const requestId = uuidv4();
    this.logger.info(`Request ${requestId}: Sending to ${activeOptions.provider} (model: ${activeOptions.modelName})`);
    
    try {
      switch(activeOptions.provider) {
        case 'anthropic':
          return await this.anthropicComplete(prompt, requestId, activeOptions);
        case 'openai':
          return await this.openaiComplete(prompt, requestId, activeOptions);
        case 'google':
            return await this.googleComplete(prompt, requestId, activeOptions);
        case 'local':
          return await this.localComplete(prompt, requestId, activeOptions);
        default:
          this.logger.error(`Unsupported LLM provider: ${activeOptions.provider}`);
          throw new Error(`Unsupported LLM provider: ${activeOptions.provider}`);
      }
    } catch (error) {
      this.logger.error(`Request ${requestId} failed for provider ${activeOptions.provider}: ${error.message}`);
      throw new Error(`LLM request failed for provider ${activeOptions.provider}: ${error.message}`);
    }
  }
  
  private async anthropicComplete(prompt: string, requestId: string, options: LLMOptions): Promise<string> {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        this.logger.error('Anthropic API key not found');
        throw new Error('Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.');
    }
    
    const baseUrl = options.baseUrl || 'https://api.anthropic.com/v1';
    
    try {
      const response = await axios.post(
        `${baseUrl}/messages`,
        {
          model: options.modelName,
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      this.logger.info(`Request ${requestId}: Received response from Anthropic`);
      if (response.data && response.data.content && response.data.content[0] && response.data.content[0].text) {
        return response.data.content[0].text;
      } else {
        this.logger.error('Invalid response structure from Anthropic', response.data);
        throw new Error('Invalid response structure from Anthropic');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      this.logger.error(`Anthropic API error: ${errorMessage}`);
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }
  }
  
  private async openaiComplete(prompt: string, requestId: string, options: LLMOptions): Promise<string> {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        this.logger.error('OpenAI API key not found');
        throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable.');
    }
    
    const baseUrl = options.baseUrl || 'https://api.openai.com/v1';
    
    try {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model: options.modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens,
          temperature: options.temperature,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      this.logger.info(`Request ${requestId}: Received response from OpenAI`);
      if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message && response.data.choices[0].message.content) {
        return response.data.choices[0].message.content;
      } else {
        this.logger.error('Invalid response structure from OpenAI', response.data);
        throw new Error('Invalid response structure from OpenAI');
      }
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        this.logger.error(`OpenAI API error: ${errorMessage}`);
        throw new Error(`OpenAI API error: ${errorMessage}`);
    }
  }

  private async googleComplete(prompt: string, requestId: string, options: LLMOptions): Promise<string> {
    const apiKey = options.apiKey || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
        this.logger.error('Google AI API key not found');
        throw new Error('Google AI API key not found. Set GOOGLE_AI_API_KEY environment variable.');
    }

    const baseUrl = options.baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${options.modelName}:generateContent`;

    try {
        const response = await axios.post(
            `${baseUrl}?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: options.temperature,
                    maxOutputTokens: options.maxTokens,
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        this.logger.info(`Request ${requestId}: Received response from Google AI`);
        if (response.data && response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content && response.data.candidates[0].content.parts && response.data.candidates[0].content.parts[0] && response.data.candidates[0].content.parts[0].text) {
            return response.data.candidates[0].content.parts[0].text;
        } else {
            this.logger.error('Invalid response structure from Google AI', response.data);
            throw new Error('Invalid response structure from Google AI');
        }
    } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        this.logger.error(`Google AI API error: ${errorMessage}`);
        throw new Error(`Google AI API error: ${errorMessage}`);
    }
}

  
  private async localComplete(prompt: string, requestId: string, options: LLMOptions): Promise<string> {
    const baseUrl = options.baseUrl || 'http://localhost:11434/api'; // Common for Ollama
    
    try {
      const response = await axios.post(
        `${baseUrl}/generate`, // Ollama generate endpoint
        {
          model: options.modelName,
          prompt: prompt,
          stream: false, // Important for non-streaming response
          options: { // Some models might use options nested here
            temperature: options.temperature,
            num_predict: options.maxTokens // Ollama uses num_predict for max tokens
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      this.logger.info(`Request ${requestId}: Received response from local LLM server`);
      if (response.data && response.data.response) {
        return response.data.response;
      } else {
        this.logger.error('Invalid response structure from Local LLM', response.data);
        throw new Error('Invalid response structure from Local LLM');
      }
    } catch (error) {
        const errorMessage = error.response?.data?.error || error.message;
        this.logger.error(`Local LLM API error: ${errorMessage}`);
        throw new Error(`Local LLM error: ${errorMessage}`);
    }
  }
  
  // Helper method to change providers or models at runtime, not strictly necessary with current `complete` method
  public setOptions(options: Partial<LLMOptions>): void {
    this.options = { ...this.options, ...options }; 
    this.logger.info(`LLMConnector options updated: provider=${this.options.provider}, model=${this.options.modelName}`);
  }
}
