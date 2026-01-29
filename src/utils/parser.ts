import type { ParsedMessage } from '../types.js';

/**
 * Parse user message to determine action type
 */
export function parseMessage(text: string): ParsedMessage {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Check for list command
  if (lower === 'list' || lower === '/list') {
    return { type: 'list' };
  }

  // Check for scan: prefix (sets prompt and optionally includes content)
  // Format: "scan: category" or "scan: category\nContent here..."
  const scanMatch = trimmed.match(/^scan:\s*(.+)/is);
  if (scanMatch) {
    const afterPrefix = scanMatch[1];
    const lines = afterPrefix.split('\n');
    const prompt = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();

    return {
      type: 'scan',
      prompt,
      content: content || undefined,
    };
  }

  // Check for text: prefix (uses last prompt)
  // Format: "text: Content to scan..."
  const textMatch = trimmed.match(/^text:\s*(.+)/is);
  if (textMatch) {
    return {
      type: 'text',
      content: textMatch[1].trim(),
    };
  }

  // Check for get: prefix
  // Format: "get: /category/slug"
  const getMatch = trimmed.match(/^get:\s*(.+)/i);
  if (getMatch) {
    let path = getMatch[1].trim();
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    return {
      type: 'get',
      path,
    };
  }

  // Check for file: prefix
  // Format: "file: /category/slug/filename.pdf"
  const fileMatch = trimmed.match(/^file:\s*(.+)/i);
  if (fileMatch) {
    let path = fileMatch[1].trim();
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    return {
      type: 'file',
      path,
    };
  }

  return { type: 'unknown' };
}

/**
 * Check if a message is a caption for file upload (simple text without prefix)
 */
export function isFileCaption(text: string): boolean {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Not a caption if it starts with a known prefix
  if (
    lower.startsWith('scan:') ||
    lower.startsWith('text:') ||
    lower.startsWith('get:') ||
    lower.startsWith('file:') ||
    lower === 'list' ||
    lower.startsWith('/')
  ) {
    return false;
  }

  // It's a caption if it's reasonably short (prompt/category name)
  return trimmed.length > 0 && trimmed.length < 100;
}

/**
 * Sanitize user input to prevent injection
 */
export function sanitize(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML-like tags
    .trim()
    .slice(0, 1000); // Limit length
}

/**
 * Extract category and slug from path
 */
export function parsePath(path: string): { category: string; slug?: string } | null {
  const cleaned = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const parts = cleaned.split('/').filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return {
    category: parts[0],
    slug: parts.length > 1 ? parts.slice(1).join('/') : undefined,
  };
}
