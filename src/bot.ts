import { Bot, GrammyError, HttpError, webhookCallback } from 'grammy';
import { autoRetry } from '@grammyjs/auto-retry';
import { hydrateFiles } from '@grammyjs/files';
import { hydrateReply, parseMode } from '@grammyjs/parse-mode';
import { apiThrottler } from '@grammyjs/transformer-throttler';
import { createServer } from 'http';
import type { BotContext } from './types.js';
import { handleStart, handleHelp, handleSetup, handleList, handleStatus } from './handlers/commands.js';
import { handleTextMessage, handleCallbackQuery } from './handlers/messages.js';
import { handleDocument, handlePhoto } from './handlers/files.js';

/**
 * Create and configure the Telegram bot
 */
export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  // Install API transformers (order matters - throttler should be first)
  // Throttler: Prevents hitting Telegram's rate limits
  const throttler = apiThrottler();
  bot.api.config.use(throttler);

  // Auto-retry: Automatically retry failed requests with exponential backoff
  bot.api.config.use(autoRetry());

  // File helpers: Simplifies file downloads
  bot.api.config.use(hydrateFiles(token));

  // Default parse mode: All replies use Markdown by default
  bot.api.config.use(parseMode('Markdown'));

  // Hydrate context for easier reply methods
  bot.use(hydrateReply);

  // Error handler with proper error type differentiation
  bot.catch((err) => {
    const ctx = err.ctx;
    const error = err.error;

    console.error(`Error while handling update ${ctx.update.update_id}:`);

    if (error instanceof GrammyError) {
      // Error from Telegram API (e.g., message too long, chat not found)
      console.error('Telegram API error:', error.description);
      console.error('Error code:', error.error_code);
      // Don't crash on API errors - they're often user-related
    } else if (error instanceof HttpError) {
      // Network error (couldn't reach Telegram)
      console.error('Network error:', error.message);
    } else {
      // Unknown error in our middleware
      console.error('Unknown error:', error);
    }
  });

  // Register command handlers
  bot.command('start', handleStart);
  bot.command('help', handleHelp);
  bot.command('setup', handleSetup);
  bot.command('list', handleList);
  bot.command('status', handleStatus);

  // Handle callback queries from inline buttons
  bot.on('callback_query:data', handleCallbackQuery);

  // Handle file uploads
  bot.on('message:document', handleDocument);
  bot.on('message:photo', handlePhoto);

  // Handle text messages (must be after commands)
  bot.on('message:text', handleTextMessage);

  return bot;
}

/**
 * Set bot commands for the menu
 */
async function setBotCommands(bot: Bot<BotContext>): Promise<void> {
  await bot.api.setMyCommands([
    { command: 'start', description: 'Welcome & setup' },
    { command: 'help', description: 'How to use this bot' },
    { command: 'setup', description: 'Configure API key' },
    { command: 'list', description: 'Show all endpoints' },
    { command: 'status', description: 'Check connection & usage' },
  ]);
}

/**
 * Start the bot in polling mode (for development)
 */
export async function startPolling(bot: Bot<BotContext>): Promise<void> {
  console.log('Starting bot in polling mode...');

  await setBotCommands(bot);

  // Drop pending updates to avoid processing old messages on restart
  await bot.api.deleteWebhook({ drop_pending_updates: true });

  await bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} is running!`);
    },
    // Allowed updates - only what we need
    allowed_updates: ['message', 'callback_query'],
  });
}

/**
 * Start the bot in webhook mode (for production)
 */
export async function startWebhook(
  bot: Bot<BotContext>,
  webhookUrl: string,
  port: number = 3000,
  secretToken?: string
): Promise<void> {
  console.log(`Starting bot in webhook mode on port ${port}...`);

  await setBotCommands(bot);

  // Set webhook with optional secret token for security
  await bot.api.setWebhook(webhookUrl, {
    secret_token: secretToken,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });

  // Create HTTP server to handle webhook requests
  const handleUpdate = webhookCallback(bot, 'http', {
    secretToken,
  });

  const server = createServer(async (req, res) => {
    // Health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Webhook endpoint
    if (req.method === 'POST') {
      try {
        await handleUpdate(req, res);
      } catch (error) {
        console.error('Webhook error:', error);
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }

    // Reject other requests
    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(port, () => {
    console.log(`Webhook server listening on port ${port}`);
    console.log(`Webhook URL: ${webhookUrl}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down webhook server...');
    server.close();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
