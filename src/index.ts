import 'dotenv/config';
import { createBot, startPolling, startWebhook } from './bot.js';

// Validate environment
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN environment variable is required');
  process.exit(1);
}

// Create bot instance
const bot = createBot(token);

// Start bot based on mode
const webhookUrl = process.env.WEBHOOK_URL;
const port = parseInt(process.env.PORT || '3000', 10);
const secretToken = process.env.WEBHOOK_SECRET;

if (webhookUrl) {
  // Production: webhook mode
  startWebhook(bot, webhookUrl, port, secretToken).catch((err) => {
    console.error('Failed to start webhook:', err);
    process.exit(1);
  });
} else {
  // Development: polling mode
  startPolling(bot).catch((err) => {
    console.error('Failed to start polling:', err);
    process.exit(1);
  });
}

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('Shutting down...');
  bot.stop();
});

process.once('SIGTERM', () => {
  console.log('Shutting down...');
  bot.stop();
});
