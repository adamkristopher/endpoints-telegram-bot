import type { ScanResult, EndpointListItem, StatsResult, EndpointDataResult } from '../types.js';

/**
 * Format welcome message
 */
export function formatWelcome(): string {
  return `🚀 *Welcome to Endpoints Bot!*

I help you scan documents and manage your endpoints from Telegram.

To get started, I need your API key from endpoints.work/api-keys`;
}

/**
 * Format help message
 */
export function formatHelp(): string {
  return `📖 *How to use Endpoints Bot*

*Scanning Files*
Upload a photo or document with a caption like:
\`job tracker\` or \`leads - acme corp\`

*Scanning Text*
\`\`\`
scan: job tracker
Meeting notes here...
\`\`\`

*Getting Data*
\`get: /job-tracker/january\`

*Listing Endpoints*
Type \`list\` or /list

*Commands*
/start - Welcome & setup
/help - This message
/setup - Configure API key
/list - Show all endpoints
/status - Check connection & usage`;
}

/**
 * Format scan result
 */
export function formatScanResult(result: ScanResult): string {
  if (!result.success) {
    return `❌ *Scan Failed*\n\n${result.error || 'Unknown error occurred'}`;
  }

  const { endpoint, item } = result;
  if (!endpoint || !item) {
    return '❌ *Scan Failed*\n\nNo data returned';
  }

  let message = `✅ *Scanned Successfully*\n\n`;
  message += `📁 *Endpoint:* \`${endpoint.path}\`\n`;
  message += `📝 *Title:* ${item.title}\n`;

  if (item.entities && Object.keys(item.entities).length > 0) {
    message += `\n*Extracted Data:*\n`;
    for (const [key, value] of Object.entries(item.entities)) {
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      message += `• *${key}:* ${displayValue.slice(0, 100)}\n`;
    }
  }

  return message;
}

/**
 * Format endpoints list
 */
export function formatEndpointsList(endpoints: EndpointListItem[]): string {
  if (endpoints.length === 0) {
    return `📋 *Your Endpoints*\n\nNo endpoints found. Upload a file to create your first one!`;
  }

  // Group by category
  const byCategory = endpoints.reduce(
    (acc, ep) => {
      if (!acc[ep.category]) {
        acc[ep.category] = [];
      }
      acc[ep.category].push(ep);
      return acc;
    },
    {} as Record<string, EndpointListItem[]>
  );

  let message = `📋 *Your Endpoints*\n\n`;

  for (const [category, eps] of Object.entries(byCategory)) {
    message += `*${category}*\n`;
    for (const ep of eps.slice(0, 5)) {
      message += `  └ \`${ep.path}\` (${ep.itemCount} items)\n`;
    }
    if (eps.length > 5) {
      message += `  └ _...and ${eps.length - 5} more_\n`;
    }
    message += '\n';
  }

  message += `\n_Tap an endpoint to view details_`;

  return message;
}

/**
 * Format stats result
 */
export function formatStats(result: StatsResult): string {
  if (!result.success) {
    return `❌ *Status Check Failed*\n\n${result.error || 'Could not connect to Endpoints API'}`;
  }

  const { usage } = result;
  if (!usage) {
    return '❌ *Status Check Failed*\n\nNo usage data returned';
  }

  const usagePercent = Math.round((usage.parsesThisMonth / usage.parseLimit) * 100);
  const progressBar = generateProgressBar(usagePercent);

  return `📊 *API Status*

✅ Connected to Endpoints API

*Plan:* ${usage.tier}
*Usage:* ${usage.parsesThisMonth} / ${usage.parseLimit} parses
${progressBar} ${usagePercent}%

_Resets at the start of each billing cycle_`;
}

/**
 * Format endpoint data result
 */
export function formatEndpointData(result: EndpointDataResult): string {
  if (!result.success) {
    return `❌ *Error*\n\n${result.error || 'Could not fetch endpoint data'}`;
  }

  const { data } = result;
  if (!data) {
    return '❌ *Error*\n\nNo data returned';
  }

  let message = `📁 *${data.path}*\n\n`;
  message += `*Total Items:* ${data.totalItems}\n\n`;

  if (data.items.length === 0) {
    message += '_No items in this endpoint_';
    return message;
  }

  message += '*Recent Items:*\n';
  for (const item of data.items.slice(0, 5)) {
    const date = new Date(item.createdAt).toLocaleDateString();
    message += `• ${item.title} _(${date})_\n`;
  }

  if (data.items.length > 5) {
    message += `\n_...and ${data.totalItems - 5} more items_`;
  }

  return message;
}

/**
 * Format unknown command error
 */
export function formatUnknownCommand(): string {
  return `❓ I didn't understand that. Here's how to use me:

📎 *Scan a file:* Upload with caption like \`job tracker\`
📝 *Scan text:* Start with \`scan: category\` then your text
📥 *Get data:* \`get: /category/slug\`
📋 *List all:* Type \`list\` or /list

Need help? /help`;
}

/**
 * Format API key prompt
 */
export function formatApiKeyPrompt(): string {
  return `🔑 *Setup API Key*

Please send me your Endpoints API key.

You can get one at: endpoints.work/api-keys

_Your key will be stored securely and used to connect to your Endpoints account._`;
}

/**
 * Format API key saved message
 */
export function formatApiKeySaved(): string {
  return `✅ *API Key Saved!*

Your bot is now connected to Endpoints.

Try uploading a document or use /status to check your account.`;
}

/**
 * Format missing API key error
 */
export function formatMissingApiKey(): string {
  return `⚠️ *API Key Required*

You haven't set up your API key yet.

Use /setup to configure your Endpoints API key.`;
}

/**
 * Generate ASCII progress bar
 */
function generateProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Escape markdown special characters for Telegram
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}
