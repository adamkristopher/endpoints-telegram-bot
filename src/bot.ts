import { Bot, session } from 'grammy';
import type { BotContext, UserSession } from './types.js';
import { handleStart, handleHelp, handleSetup, handleList, handleStatus } from './handlers/commands.js';
import { handleTextMessage, handleCallbackQuery } from './handlers/messages.js';
import { handleDocument, handlePhoto } from './handlers/files.js';

/**
 * Create and configure the Telegram bot
 */
export function createBot(token: string): Bot<BotContext> {
  const bot = new Bot<BotContext>(token);

  // Set up session middleware
  bot.use(
    session({
      initial: (): UserSession => ({}),
    })
  );

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err.error);
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
 * Start the bot in polling mode (for development)
 */
export async function startPolling(bot: Bot<BotContext>): Promise<void> {
  console.log('Starting bot in polling mode...');

  // Set bot commands for menu
  await bot.api.setMyCommands([
    { command: 'start', description: 'Welcome & setup' },
    { command: 'help', description: 'How to use this bot' },
    { command: 'setup', description: 'Configure API key' },
    { command: 'list', description: 'Show all endpoints' },
    { command: 'status', description: 'Check connection & usage' },
  ]);

  await bot.start({
    onStart: (botInfo) => {
      console.log(`Bot @${botInfo.username} is running!`);
    },
  });
}

/**
 * Start the bot in webhook mode (for production)
 */
export async function startWebhook(
  bot: Bot<BotContext>,
  webhookUrl: string,
  port: number = 3000
): Promise<void> {
  console.log(`Starting bot in webhook mode on port ${port}...`);

  // Set bot commands for menu
  await bot.api.setMyCommands([
    { command: 'start', description: 'Welcome & setup' },
    { command: 'help', description: 'How to use this bot' },
    { command: 'setup', description: 'Configure API key' },
    { command: 'list', description: 'Show all endpoints' },
    { command: 'status', description: 'Check connection & usage' },
  ]);

  // Set webhook
  await bot.api.setWebhook(webhookUrl);

  console.log(`Webhook set to: ${webhookUrl}`);
}
