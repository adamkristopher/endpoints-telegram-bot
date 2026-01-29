import { describe, it, expect } from 'vitest';
import {
  formatScanResult,
  formatEndpointsList,
  formatStats,
  formatEndpointData,
  escapeMarkdown,
} from './formatters.js';

describe('formatScanResult', () => {
  it('should format successful scan', () => {
    const result = formatScanResult({
      success: true,
      endpoint: { path: '/leads/acme', category: 'leads', slug: 'acme' },
      item: {
        id: '123',
        title: 'Acme Corp Meeting',
        entities: { company: 'Acme Corp', contact: 'John Smith' },
      },
    });

    expect(result).toContain('✅ *Scanned Successfully*');
    expect(result).toContain('/leads/acme');
    expect(result).toContain('Acme Corp Meeting');
    expect(result).toContain('company');
    expect(result).toContain('Acme Corp');
  });

  it('should format failed scan', () => {
    const result = formatScanResult({
      success: false,
      error: 'Invalid API key',
    });

    expect(result).toContain('❌ *Scan Failed*');
    expect(result).toContain('Invalid API key');
  });
});

describe('formatEndpointsList', () => {
  it('should format empty list', () => {
    const result = formatEndpointsList([]);
    expect(result).toContain('No endpoints found');
  });

  it('should format endpoints grouped by category', () => {
    const result = formatEndpointsList([
      { path: '/leads/acme', category: 'leads', slug: 'acme', itemCount: 5, lastUpdated: '2024-01-01' },
      { path: '/leads/beta', category: 'leads', slug: 'beta', itemCount: 3, lastUpdated: '2024-01-02' },
      { path: '/jobs/dev', category: 'jobs', slug: 'dev', itemCount: 10, lastUpdated: '2024-01-03' },
    ]);

    expect(result).toContain('*leads*');
    expect(result).toContain('/leads/acme');
    expect(result).toContain('5 items');
    expect(result).toContain('*jobs*');
  });
});

describe('formatStats', () => {
  it('should format successful stats', () => {
    const result = formatStats({
      success: true,
      usage: {
        parsesThisMonth: 25,
        parseLimit: 50,
        tier: 'Free',
      },
    });

    expect(result).toContain('📊 *API Status*');
    expect(result).toContain('Connected');
    expect(result).toContain('Free');
    expect(result).toContain('25 / 50');
    expect(result).toContain('50%');
  });

  it('should format failed stats', () => {
    const result = formatStats({
      success: false,
      error: 'Connection failed',
    });

    expect(result).toContain('❌ *Status Check Failed*');
    expect(result).toContain('Connection failed');
  });
});

describe('formatEndpointData', () => {
  it('should format endpoint with items', () => {
    const result = formatEndpointData({
      success: true,
      data: {
        path: '/leads/acme',
        totalItems: 3,
        items: [
          { id: '1', title: 'First Meeting', createdAt: '2024-01-01', entities: {} },
          { id: '2', title: 'Follow Up', createdAt: '2024-01-02', entities: {} },
          { id: '3', title: 'Contract', createdAt: '2024-01-03', entities: {} },
        ],
      },
    });

    expect(result).toContain('/leads/acme');
    expect(result).toContain('Total Items:* 3');
    expect(result).toContain('First Meeting');
    expect(result).toContain('Follow Up');
  });

  it('should format empty endpoint', () => {
    const result = formatEndpointData({
      success: true,
      data: {
        path: '/empty',
        totalItems: 0,
        items: [],
      },
    });

    expect(result).toContain('No items in this endpoint');
  });
});

describe('escapeMarkdown', () => {
  it('should escape special characters', () => {
    expect(escapeMarkdown('hello_world')).toBe('hello\\_world');
    expect(escapeMarkdown('*bold*')).toBe('\\*bold\\*');
    expect(escapeMarkdown('[link](url)')).toBe('\\[link\\]\\(url\\)');
  });
});
