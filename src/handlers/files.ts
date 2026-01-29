import type { BotContext } from '../types.js';
import { isFileCaption, sanitize } from '../utils/parser.js';
import { formatScanResult, formatMissingApiKey } from '../utils/formatters.js';
import { scanSuccessKeyboard, errorHelpKeyboard } from '../utils/keyboards.js';
import { getApiKey, getLastPrompt, setLastPrompt } from '../services/state.js';
import { scanFile } from '../services/endpoints-api.js';

// Maximum file size in bytes (10MB to match Endpoints limit)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Handle document upload
 */
export async function handleDocument(ctx: BotContext): Promise<void> {
  const document = ctx.message?.document;
  if (!document) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    await ctx.reply(formatMissingApiKey());
    return;
  }

  // Check file size
  if (document.file_size && document.file_size > MAX_FILE_SIZE) {
    await ctx.reply('⚠️ File too large. Maximum size is 10MB.');
    return;
  }

  // Get prompt from caption or last prompt
  const caption = ctx.message?.caption?.trim();
  let prompt: string | undefined;

  if (caption && isFileCaption(caption)) {
    prompt = sanitize(caption);
    await setLastPrompt(userId, prompt);
  } else {
    prompt = await getLastPrompt(userId);
  }

  if (!prompt) {
    await ctx.reply(
      '⚠️ Please include a caption with your file (e.g., "job tracker") or set a prompt first with `scan: category`'
    );
    return;
  }

  // Show typing indicator
  await ctx.replyWithChatAction('upload_document');

  try {
    // Download file using grammY's file helper (handles URL construction automatically)
    const file = await ctx.getFile();
    const buffer = Buffer.from(await file.download());

    const filename = document.file_name || 'document';
    const mimeType = document.mime_type || 'application/octet-stream';

    // Scan the file
    const result = await scanFile(apiKey, prompt, buffer, filename, mimeType);

    const message = formatScanResult(result);
    const keyboard =
      result.success && result.endpoint ? scanSuccessKeyboard(result.endpoint.path) : errorHelpKeyboard();

    await ctx.reply(message, { reply_markup: keyboard });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await ctx.reply(`❌ Failed to process file: ${errorMessage}`);
  }
}

/**
 * Handle photo upload
 */
export async function handlePhoto(ctx: BotContext): Promise<void> {
  const photos = ctx.message?.photo;
  if (!photos || photos.length === 0) return;

  const userId = ctx.from?.id;
  if (!userId) return;

  const apiKey = await getApiKey(userId);
  if (!apiKey) {
    await ctx.reply(formatMissingApiKey());
    return;
  }

  // Get the largest photo (last in array)
  const photo = photos[photos.length - 1];

  // Check file size
  if (photo.file_size && photo.file_size > MAX_FILE_SIZE) {
    await ctx.reply('⚠️ Image too large. Maximum size is 10MB.');
    return;
  }

  // Get prompt from caption or last prompt
  const caption = ctx.message?.caption?.trim();
  let prompt: string | undefined;

  if (caption && isFileCaption(caption)) {
    prompt = sanitize(caption);
    await setLastPrompt(userId, prompt);
  } else {
    prompt = await getLastPrompt(userId);
  }

  if (!prompt) {
    await ctx.reply(
      '⚠️ Please include a caption with your photo (e.g., "receipts") or set a prompt first with `scan: category`'
    );
    return;
  }

  // Show typing indicator
  await ctx.replyWithChatAction('upload_photo');

  try {
    // Download largest photo using grammY's file helper
    // For photos, we need to get the file directly since ctx.getFile() works on documents
    const file = await ctx.api.getFile(photo.file_id);
    const fileUrl = file.getUrl();
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error('Failed to download photo from Telegram');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `photo_${Date.now()}.jpg`;
    const mimeType = 'image/jpeg';

    // Scan the photo
    const result = await scanFile(apiKey, prompt, buffer, filename, mimeType);

    const message = formatScanResult(result);
    const keyboard =
      result.success && result.endpoint ? scanSuccessKeyboard(result.endpoint.path) : errorHelpKeyboard();

    await ctx.reply(message, { reply_markup: keyboard });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await ctx.reply(`❌ Failed to process photo: ${errorMessage}`);
  }
}
