import type { ScanResult, EndpointListItem, StatsResult, EndpointDataResult } from '../types.js';

const API_URL = process.env.ENDPOINTS_API_URL || 'https://endpoints.work';

/**
 * Make authenticated request to Endpoints API
 */
async function apiRequest<T>(
  apiKey: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Scan text content
 */
export async function scanText(
  apiKey: string,
  prompt: string,
  text: string
): Promise<ScanResult> {
  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('texts', text);

    const result = await apiRequest<{
      endpoint: { path: string; category: string; slug: string };
      entriesAdded: number;
      metadata: { newMetadata: Record<string, unknown> };
    }>(apiKey, '/api/scan', {
      method: 'POST',
      body: formData,
    });

    // Extract first item from newMetadata
    const itemId = Object.keys(result.metadata?.newMetadata || {})[0];
    const itemData = itemId ? result.metadata.newMetadata[itemId] as Record<string, unknown> : null;

    return {
      success: true,
      endpoint: result.endpoint,
      item: itemData ? {
        id: itemId,
        title: (itemData.summary as string) || 'Scanned item',
        entities: itemData.entities as Record<string, unknown> || {},
      } : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Scan file content
 */
export async function scanFile(
  apiKey: string,
  prompt: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ScanResult> {
  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('files', new Blob([fileBuffer], { type: mimeType }), filename);

    const result = await apiRequest<{
      endpoint: { path: string; category: string; slug: string };
      entriesAdded: number;
      metadata: { newMetadata: Record<string, unknown> };
    }>(apiKey, '/api/scan', {
      method: 'POST',
      body: formData,
    });

    // Extract first item from newMetadata
    const itemId = Object.keys(result.metadata?.newMetadata || {})[0];
    const itemData = itemId ? result.metadata.newMetadata[itemId] as Record<string, unknown> : null;

    return {
      success: true,
      endpoint: result.endpoint,
      item: itemData ? {
        id: itemId,
        title: (itemData.summary as string) || 'Scanned item',
        entities: itemData.entities as Record<string, unknown> || {},
      } : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * List all endpoints for user
 */
export async function listEndpoints(apiKey: string): Promise<EndpointListItem[]> {
  try {
    const result = await apiRequest<{
      categories: Array<{
        name: string;
        endpoints: Array<{ id: number; path: string; slug: string; itemCount?: number }>;
      }>;
    }>(apiKey, '/api/endpoints/tree');

    // Flatten categories into endpoint list
    const endpoints: EndpointListItem[] = [];
    for (const category of result.categories || []) {
      for (const ep of category.endpoints || []) {
        endpoints.push({
          path: ep.path,
          category: category.name,
          slug: ep.slug,
          itemCount: ep.itemCount || 0,
        });
      }
    }
    return endpoints;
  } catch {
    return [];
  }
}

/**
 * Get endpoint data
 */
export async function getEndpoint(apiKey: string, path: string): Promise<EndpointDataResult> {
  try {
    // Normalize path: /category/slug -> /api/endpoints/category/slug
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const apiPath = `/api/endpoints${cleanPath}`;

    const result = await apiRequest<{
      endpoint: { id: number; path: string; category: string; slug: string };
      metadata: {
        oldMetadata: Record<string, unknown>;
        newMetadata: Record<string, unknown>;
      };
      totalItems: number;
    }>(apiKey, apiPath);

    // Convert metadata to items array
    const items: Array<{ id: string; title: string; createdAt: string; entities: Record<string, unknown> }> = [];
    const allMetadata = { ...result.metadata?.oldMetadata, ...result.metadata?.newMetadata };
    for (const [id, data] of Object.entries(allMetadata)) {
      const itemData = data as Record<string, unknown>;
      items.push({
        id,
        title: (itemData.summary as string) || 'Item',
        createdAt: (itemData.createdAt as string) || '',
        entities: (itemData.entities as Record<string, unknown>) || {},
      });
    }

    return {
      success: true,
      data: {
        path: result.endpoint?.path || path,
        items,
        totalItems: result.totalItems || items.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get user stats (usage, tier, etc.)
 */
export async function getStats(apiKey: string): Promise<StatsResult> {
  try {
    const result = await apiRequest<{
      tier: string;
      parsesUsed: number;
      parsesLimit: number;
      storageUsed: number;
      storageLimit: number;
      billingPeriodStart: string;
      billingPeriodEnd: string;
    }>(apiKey, '/api/billing/stats');

    return {
      success: true,
      usage: {
        parsesThisMonth: result.parsesUsed,
        parseLimit: result.parsesLimit,
        tier: result.tier,
        storageUsed: result.storageUsed,
        storageLimit: result.storageLimit,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate API key by making a test request
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    // Use endpoints/tree since billing/stats may require session auth
    await apiRequest(apiKey, '/api/endpoints/tree');
    return true;
  } catch {
    return false;
  }
}
