import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5.2',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
}));
