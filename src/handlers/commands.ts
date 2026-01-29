import type { BotContext } from '../types.js';
import {
  formatWelcome,
  formatHelp,
  formatStats,
  formatEndpointsList,
  formatApiKeyPrompt,
  formatApiKeySaved,
  formatMissingApiKey,
} from '../utils/formatters.js';
import { welcomeKeyboard, setupKeyboard, apiKeySavedKeyboard, endpointsListKeyboard } from '../utils/keyboards.js';
import { getApiKey, setApiKey, hasApiKey } from '../services/state.js';
import { getStats, listEndpoints, validateApiKey } from '../services/endpoints-api.js';

/**
 * Handle /start command
 */
export async function handleStart(ctx: BotContext): Promise<void> {
  await ctx.reply(formatWelcome(), {
    parse_mode: 'Markdown',
    reply_markup: welcomeKeyboard(),
  });
}

/**
 * Handle /help command
 */
export async function handleHelp(ctx: BotContext): Promise<void> {
  await ctx.reply(formatHelp(), {
    parse_mode: 'Markdown',
  });
}

/**
 * Handle /setup command
 */
export async function handleSetup(ctx: BotContext): Promise<void> {
  // Only allow setup in private chat
  if (ctx.chat?.type !== 'private') {
    await ctx.reply('⚠️ Please set up your API key in a private message to me for security.');
    return;
  }

  // Check if already has API key
  const userId = ctx.from?.id;
  if (!userId) return;

  const existing = await hasApiKey(userId);
  if (existing) {
    await ctx.reply('🔑 You already have an API key configured.\n\nSend me a new key to update it, or use /status to check your connection.', {
      parse_mode: 'Markdown',
    });
    return;
  }

  await ctx.reply(formatApiKeyPrompt(), {
    parse_mode: 'Markdown',
    reply_markup: setupKeyboard(),
  });
}

/**
 * Handle /list command
 */
export async function handleList(ctx: BotContext): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    await ctx.reply(formatMissingApiKey(), {
      parse_mode: 'Markdown',
    });
    return;
  }

  // Show typing indicator
  await ctx.replyWithChatAction('typing');

  const endpoints = await listEndpoints(apiKey);
  const message = formatEndpointsList(endpoints);
  const keyboard = endpoints.length > 0 ? endpointsListKeyboard(endpoints) : undefined;

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Handle /status command
 */
export async function handleStatus(ctx: BotContext): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    await ctx.reply(formatMissingApiKey(), {
      parse_mode: 'Markdown',
    });
    return;
  }

  // Show typing indicator
  await ctx.replyWithChatAction('typing');

  const stats = await getStats(apiKey);
  await ctx.reply(formatStats(stats), {
    parse_mode: 'Markdown',
  });
}

/**
 * Handle potential API key input (called from message handler)
 */
export async function handleApiKeyInput(ctx: BotContext, text: string): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;

  // Check if it looks like an API key (starts with ep_ and is long enough)
  if (!text.startsWith('ep_') || text.length < 20) {
    return false;
  }

  // Only accept in private chat
  if (ctx.chat?.type !== 'private') {
    await ctx.reply('⚠️ Please send your API key in a private message for security.');
    return true;
  }

  // Show typing indicator
  await ctx.replyWithChatAction('typing');

  // Validate the key
  const isValid = await validateApiKey(text);
  if (!isValid) {
    await ctx.reply('❌ Invalid API key. Please check and try again.\n\nGet your key at: endpoints.work/api-keys');
    return true;
  }

  // Save the key
  await setApiKey(userId, text);

  await ctx.reply(formatApiKeySaved(), {
    parse_mode: 'Markdown',
    reply_markup: apiKeySavedKeyboard(),
  });

  return true;
}
