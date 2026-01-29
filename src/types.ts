import type { Context, SessionFlavor } from 'grammy';

/**
 * User session data persisted across bot restarts
 */
export interface UserSession {
  /** Endpoints API key */
  apiKey?: string;
  /** Last used scan prompt/category */
  lastPrompt?: string;
  /** When the API key was linked */
  linkedAt?: string;
}

/**
 * Custom context with session data
 */
export type BotContext = Context & SessionFlavor<UserSession>;

/**
 * Parsed message result from user input
 */
export interface ParsedMessage {
  type: 'scan' | 'text' | 'get' | 'file' | 'list' | 'unknown';
  prompt?: string;
  content?: string;
  path?: string;
}

/**
 * Endpoints API scan result
 */
export interface ScanResult {
  success: boolean;
  endpoint?: {
    path: string;
    category: string;
    slug: string;
  };
  item?: {
    id: string;
    title: string;
    entities: Record<string, unknown>;
  };
  error?: string;
}

/**
 * Endpoints API list result
 */
export interface EndpointListItem {
  path: string;
  category: string;
  slug: string;
  itemCount: number;
  lastUpdated: string;
}

/**
 * Endpoints API stats result
 */
export interface StatsResult {
  success: boolean;
  usage?: {
    parsesThisMonth: number;
    parseLimit: number;
    tier: string;
  };
  error?: string;
}

/**
 * Endpoints API endpoint data result
 */
export interface EndpointDataResult {
  success: boolean;
  data?: {
    path: string;
    items: Array<{
      id: string;
      title: string;
      createdAt: string;
      entities: Record<string, unknown>;
    }>;
    totalItems: number;
  };
  error?: string;
}
