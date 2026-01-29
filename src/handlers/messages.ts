import type { BotContext } from '../types.js';
import { parseMessage, sanitize } from '../utils/parser.js';
import {
  formatScanResult,
  formatEndpointData,
  formatUnknownCommand,
  formatMissingApiKey,
  formatHelp,
  formatStats,
  formatEndpointsList,
} from '../utils/formatters.js';
import { errorHelpKeyboard, scanSuccessKeyboard, endpointDetailKeyboard, endpointsListKeyboard } from '../utils/keyboards.js';
import { getApiKey, setLastPrompt, getLastPrompt } from '../services/state.js';
import { scanText, getEndpoint, listEndpoints, getStats } from '../services/endpoints-api.js';
import { handleApiKeyInput, handleHelp, handleList, handleStatus } from './commands.js';

/**
 * Handle text messages
 */
export async function handleTextMessage(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text;
  if (!text) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  // Check if this is an API key input
  const wasApiKey = await handleApiKeyInput(ctx, text.trim());
  if (wasApiKey) return;

  // Parse the message
  const parsed = parseMessage(text);

  switch (parsed.type) {
    case 'list':
      await handleListMessage(ctx);
      break;

    case 'scan':
      await handleScanMessage(ctx, parsed.prompt!, parsed.content);
      break;

    case 'text':
      await handleTextScanMessage(ctx, parsed.content!);
      break;

    case 'get':
      await handleGetMessage(ctx, parsed.path!);
      break;

    case 'file':
      await handleFileGetMessage(ctx, parsed.path!);
      break;

    case 'unknown':
    default:
      await handleUnknownMessage(ctx);
      break;
  }
}

/**
 * Handle list message
 */
async function handleListMessage(ctx: BotContext): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    await ctx.reply(formatMissingApiKey(), { parse_mode: 'Markdown' });
    return;
  }

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
 * Handle scan: prefix message
 */
async function handleScanMessage(ctx: BotContext, prompt: string, content?: string): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    await ctx.reply(formatMissingApiKey(), { parse_mode: 'Markdown' });
    return;
  }

  // Save the prompt for future use
  const sanitizedPrompt = sanitize(prompt);
  await setLastPrompt(userId, sanitizedPrompt);

  // If no content provided, just confirm prompt was set
  if (!content) {
    await ctx.reply(`✅ Prompt set to: *${sanitizedPrompt}*\n\nNow send me text or a file to scan.`, {
      parse_mode: 'Markdown',
    });
    return;
  }

  // Scan the content
  await ctx.replyWithChatAction('typing');

  const sanitizedContent = sanitize(content);
  const result = await scanText(apiKey, sanitizedPrompt, sanitizedContent);

  const message = formatScanResult(result);
  const keyboard = result.success && result.endpoint ? scanSuccessKeyboard(result.endpoint.path) : errorHelpKeyboard();

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Handle text: prefix message (uses last prompt)
 */
async function handleTextScanMessage(ctx: BotContext, content: string): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    await ctx.reply(formatMissingApiKey(), { parse_mode: 'Markdown' });
    return;
  }

  const prompt = await getLastPrompt(userId);
  if (!prompt) {
    await ctx.reply('⚠️ No prompt set. Use `scan: category` first to set a prompt.', {
      parse_mode: 'Markdown',
    });
    return;
  }

  await ctx.replyWithChatAction('typing');

  const sanitizedContent = sanitize(content);
  const result = await scanText(apiKey, prompt, sanitizedContent);

  const message = formatScanResult(result);
  const keyboard = result.success && result.endpoint ? scanSuccessKeyboard(result.endpoint.path) : errorHelpKeyboard();

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Handle get: prefix message
 */
async function handleGetMessage(ctx: BotContext, path: string): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    await ctx.reply(formatMissingApiKey(), { parse_mode: 'Markdown' });
    return;
  }

  await ctx.replyWithChatAction('typing');

  const result = await getEndpoint(apiKey, path);
  const message = formatEndpointData(result);
  const keyboard = result.success ? endpointDetailKeyboard(path) : errorHelpKeyboard();

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

/**
 * Handle file: prefix message (get specific file from endpoint)
 */
async function handleFileGetMessage(ctx: BotContext, path: string): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    await ctx.reply(formatMissingApiKey(), { parse_mode: 'Markdown' });
    return;
  }

  // TODO: Implement file download from Endpoints API
  await ctx.reply('📁 File download coming soon!\n\nFor now, view files at: endpoints.work' + path, {
    parse_mode: 'Markdown',
  });
}

/**
 * Handle unknown message format
 */
async function handleUnknownMessage(ctx: BotContext): Promise<void> {
  await ctx.reply(formatUnknownCommand(), {
    parse_mode: 'Markdown',
    reply_markup: errorHelpKeyboard(),
  });
}

/**
 * Handle callback queries from inline buttons
 */
export async function handleCallbackQuery(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  // Acknowledge the callback
  await ctx.answerCallbackQuery();

  // Parse callback data
  if (data === 'help') {
    await ctx.reply(formatHelp(), { parse_mode: 'Markdown' });
  } else if (data === 'setup' || data === 'setup_ready') {
    // Trigger setup flow
    const message = '🔑 Please send me your Endpoints API key now.\n\nGet one at: endpoints.work/api-keys';
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } else if (data === 'status') {
    const apiKey = await getApiKey(userId);
    if (!apiKey) {
      await ctx.reply(formatMissingApiKey(), { parse_mode: 'Markdown' });
      return;
    }
    await ctx.replyWithChatAction('typing');
    const stats = await getStats(apiKey);
    await ctx.reply(formatStats(stats), { parse_mode: 'Markdown' });
  } else if (data === 'list') {
    const apiKey = await getApiKey(userId);
    if (!apiKey) {
      await ctx.reply(formatMissingApiKey(), { parse_mode: 'Markdown' });
      return;
    }
    await ctx.replyWithChatAction('typing');
    const endpoints = await listEndpoints(apiKey);
    const message = formatEndpointsList(endpoints);
    const keyboard = endpoints.length > 0 ? endpointsListKeyboard(endpoints) : undefined;
    await ctx.reply(message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } else if (data.startsWith('get:')) {
    const path = data.slice(4);
    await handleGetMessage(ctx, path);
  } else if (data.startsWith('refresh:')) {
    const path = data.slice(8);
    await handleGetMessage(ctx, path);
  } else if (data === 'web_link') {
    await ctx.reply('🌐 View all endpoints at: endpoints.work/dashboard');
  } else if (data === 'cancel') {
    await ctx.reply('Cancelled.');
  }
}
