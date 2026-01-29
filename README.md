# Endpoints Telegram Bot

A Telegram bot that allows you to scan documents and manage your [Endpoints](https://endpoints.work) from your phone or anywhere Telegram is available.

## Features

- 📎 **Scan files** - Upload photos or documents directly to create structured data
- 📝 **Scan text** - Parse meeting notes, emails, or any text content
- 📋 **List endpoints** - View all your endpoints organized by category
- 📊 **Check status** - Monitor your API usage and subscription tier
- 🔐 **Secure** - API keys are encrypted and stored locally

## Quick Start

### 1. Create a Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token you receive

### 2. Get Your Endpoints API Key

1. Go to [endpoints.work/api-keys](https://endpoints.work/api-keys)
2. Create a new API key
3. Copy the key (starts with `ep_`)

### 3. Run the Bot

```bash
# Clone the repository
git clone https://github.com/adamkristopher/endpoints-telegram-bot.git
cd endpoints-telegram-bot

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and add your TELEGRAM_BOT_TOKEN
nano .env

# Start the bot
npm run dev
```

### 4. Connect Your Account

1. Find your bot on Telegram
2. Send `/start`
3. Click "Setup API Key" and send your `ep_` key

## Usage

### Scanning Files

Upload a photo or document with a caption describing what to track:

```
📸 [photo] job tracker
📎 [document] leads - acme corp
```

### Scanning Text

```
scan: job tracker
Had a great call with Sarah from Acme Corp today.
She's interested in our enterprise plan.
Contact: sarah@acme.com
```

### Getting Data

```
get: /leads/acme-corp
```

### Listing Endpoints

Type `list` or use the `/list` command.

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and setup |
| `/help` | Usage guide |
| `/setup` | Configure your API key |
| `/list` | Show all your endpoints |
| `/status` | Check API connection and usage |

## Message Prefixes

| Prefix | Action | Example |
|--------|--------|---------|
| `scan:` | Set prompt + scan content | `scan: job tracker\nMeeting notes...` |
| `text:` | Scan using last prompt | `text: More meeting notes...` |
| `get:` | Retrieve endpoint data | `get: /leads/acme` |
| `list` | List all endpoints | `list` |

## Development

```bash
# Run in development mode (with hot reload)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Start production build
npm start
```

## Deployment

### Using Webhook Mode (Recommended for Production)

Set the `WEBHOOK_URL` environment variable to enable webhook mode:

```env
TELEGRAM_BOT_TOKEN=your-token
WEBHOOK_URL=https://your-server.com/webhook
PORT=3000
```

The bot will automatically set up the webhook when started.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["npm", "start"]
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | - | Bot token from @BotFather |
| `ENDPOINTS_API_URL` | No | `https://endpoints.work` | Endpoints API URL |
| `DATABASE_PATH` | No | `./data/bot.sqlite` | SQLite database path |
| `WEBHOOK_URL` | No | - | Webhook URL (enables webhook mode) |
| `WEBHOOK_SECRET` | No | - | Secret token for webhook verification |
| `PORT` | No | `3000` | Server port for webhook mode |
| `ENCRYPTION_KEY` | No | Bot token | Key for encrypting stored API keys |

## Production Features

This bot uses grammY plugins for production reliability:

| Plugin | Purpose |
|--------|---------|
| `@grammyjs/auto-retry` | Automatically retries failed API requests with exponential backoff |
| `@grammyjs/transformer-throttler` | Prevents hitting Telegram's rate limits |
| `@grammyjs/files` | Simplifies file downloads from Telegram |
| `@grammyjs/parse-mode` | Sets default Markdown formatting for all messages |
| `@grammyjs/hydrate` | Provides convenient context methods |

The bot also includes:
- Proper error differentiation (GrammyError vs HttpError vs unknown)
- Health check endpoint at `/health` for monitoring
- Graceful shutdown handling
- Webhook secret token verification

## Security

- API keys are encrypted using AES-256-CBC before storage
- `/setup` command only works in private chats
- All user inputs are sanitized before processing

## License

MIT

## Links

- [Endpoints](https://endpoints.work) - The main Endpoints application
- [grammY](https://grammy.dev/) - The Telegram bot framework used
- [Report Issues](https://github.com/adamkristopher/endpoints-telegram-bot/issues)
