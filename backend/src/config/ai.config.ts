import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  aiProvider: process.env.AI_PROVIDER || 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5.2',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
}));
