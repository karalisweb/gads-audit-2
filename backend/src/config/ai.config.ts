import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  aiProvider: process.env.AI_PROVIDER || 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-5.2',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
  claudeApiKey: process.env.CLAUDE_API_KEY,
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
}));
