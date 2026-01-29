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
    const result = await apiRequest<{
      endpoint: { path: string; category: string; slug: string };
      item: { id: string; title: string; entities: Record<string, unknown> };
    }>(apiKey, '/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        content: text,
        type: 'text',
      }),
    });

    return {
      success: true,
      endpoint: result.endpoint,
      item: result.item,
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
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), filename);

    const result = await apiRequest<{
      endpoint: { path: string; category: string; slug: string };
      item: { id: string; title: string; entities: Record<string, unknown> };
    }>(apiKey, '/api/scan', {
      method: 'POST',
      body: formData,
    });

    return {
      success: true,
      endpoint: result.endpoint,
      item: result.item,
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
      endpoints: EndpointListItem[];
    }>(apiKey, '/api/endpoints');

    return result.endpoints || [];
  } catch {
    return [];
  }
}

/**
 * Get endpoint data
 */
export async function getEndpoint(apiKey: string, path: string): Promise<EndpointDataResult> {
  try {
    // Ensure path starts with /api
    const apiPath = path.startsWith('/api') ? path : `/api${path}`;

    const result = await apiRequest<{
      path: string;
      items: Array<{
        id: string;
        title: string;
        createdAt: string;
        entities: Record<string, unknown>;
      }>;
      totalItems: number;
    }>(apiKey, apiPath);

    return {
      success: true,
      data: result,
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
      parsesThisMonth: number;
      parseLimit: number;
      tier: string;
    }>(apiKey, '/api/user/stats');

    return {
      success: true,
      usage: result,
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
    await apiRequest(apiKey, '/api/user/stats');
    return true;
  } catch {
    return false;
  }
}
