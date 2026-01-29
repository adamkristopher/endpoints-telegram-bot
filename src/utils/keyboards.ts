import { InlineKeyboard } from 'grammy';
import type { EndpointListItem } from '../types.js';

/**
 * Welcome message keyboard
 */
export function welcomeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url('🔑 Get API Key', 'https://endpoints.work/api-keys')
    .row()
    .text('📖 How it works', 'help')
    .text('⚙️ Setup API Key', 'setup');
}

/**
 * Setup confirmation keyboard
 */
export function setupKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url('🔑 Get API Key', 'https://endpoints.work/api-keys')
    .row()
    .text('✅ I have my key', 'setup_ready');
}

/**
 * API key saved confirmation keyboard
 */
export function apiKeySavedKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📊 Check Status', 'status')
    .text('📋 List Endpoints', 'list');
}

/**
 * Endpoints list keyboard with inline buttons
 */
export function endpointsListKeyboard(endpoints: EndpointListItem[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // Group endpoints by category
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

  // Add buttons for each endpoint (max 10 to avoid hitting Telegram limits)
  let count = 0;
  for (const [category, eps] of Object.entries(byCategory)) {
    for (const ep of eps) {
      if (count >= 10) break;
      keyboard.text(`📁 ${ep.path}`, `get:${ep.path}`).row();
      count++;
    }
    if (count >= 10) break;
  }

  if (endpoints.length > 10) {
    keyboard.text('📖 View all on web', 'web_link');
  }

  return keyboard;
}

/**
 * Endpoint detail keyboard
 */
export function endpointDetailKeyboard(path: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('🔄 Refresh', `refresh:${path}`)
    .url('🌐 View on web', `https://endpoints.work${path}`);
}

/**
 * Error with help keyboard
 */
export function errorHelpKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('📖 Show Help', 'help').text('⚙️ Setup', 'setup');
}

/**
 * After scan success keyboard
 */
export function scanSuccessKeyboard(path: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('📁 View Endpoint', `get:${path}`)
    .row()
    .url('🌐 Open in Browser', `https://endpoints.work${path}`);
}

/**
 * Confirm action keyboard
 */
export function confirmKeyboard(action: string): InlineKeyboard {
  return new InlineKeyboard().text('✅ Confirm', `confirm:${action}`).text('❌ Cancel', 'cancel');
}
