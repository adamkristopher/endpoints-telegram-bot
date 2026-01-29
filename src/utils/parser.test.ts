import { describe, it, expect } from 'vitest';
import { parseMessage, isFileCaption, sanitize, parsePath } from './parser.js';

describe('parseMessage', () => {
  it('should parse list command', () => {
    expect(parseMessage('list')).toEqual({ type: 'list' });
    expect(parseMessage('LIST')).toEqual({ type: 'list' });
    expect(parseMessage('/list')).toEqual({ type: 'list' });
  });

  it('should parse scan: prefix with prompt only', () => {
    const result = parseMessage('scan: job tracker');
    expect(result).toEqual({
      type: 'scan',
      prompt: 'job tracker',
      content: undefined,
    });
  });

  it('should parse scan: prefix with prompt and content', () => {
    const result = parseMessage('scan: job tracker\nMeeting with John about Q1');
    expect(result).toEqual({
      type: 'scan',
      prompt: 'job tracker',
      content: 'Meeting with John about Q1',
    });
  });

  it('should parse scan: prefix with multiline content', () => {
    const result = parseMessage('scan: research\nLine 1\nLine 2\nLine 3');
    expect(result).toEqual({
      type: 'scan',
      prompt: 'research',
      content: 'Line 1\nLine 2\nLine 3',
    });
  });

  it('should parse text: prefix', () => {
    const result = parseMessage('text: Meeting notes about the project');
    expect(result).toEqual({
      type: 'text',
      content: 'Meeting notes about the project',
    });
  });

  it('should parse get: prefix', () => {
    expect(parseMessage('get: /job-tracker/january')).toEqual({
      type: 'get',
      path: '/job-tracker/january',
    });

    // Should add leading slash if missing
    expect(parseMessage('get: leads/acme')).toEqual({
      type: 'get',
      path: '/leads/acme',
    });
  });

  it('should parse file: prefix', () => {
    expect(parseMessage('file: /leads/acme/resume.pdf')).toEqual({
      type: 'file',
      path: '/leads/acme/resume.pdf',
    });
  });

  it('should return unknown for unrecognized format', () => {
    expect(parseMessage('hello there')).toEqual({ type: 'unknown' });
    expect(parseMessage('random text')).toEqual({ type: 'unknown' });
  });
});

describe('isFileCaption', () => {
  it('should return true for simple captions', () => {
    expect(isFileCaption('job tracker')).toBe(true);
    expect(isFileCaption('leads - acme corp')).toBe(true);
    expect(isFileCaption('receipts')).toBe(true);
  });

  it('should return false for command prefixes', () => {
    expect(isFileCaption('scan: something')).toBe(false);
    expect(isFileCaption('text: something')).toBe(false);
    expect(isFileCaption('get: /path')).toBe(false);
    expect(isFileCaption('/list')).toBe(false);
    expect(isFileCaption('list')).toBe(false);
  });

  it('should return false for empty or too long text', () => {
    expect(isFileCaption('')).toBe(false);
    expect(isFileCaption('a'.repeat(101))).toBe(false);
  });
});

describe('sanitize', () => {
  it('should remove HTML-like tags', () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
  });

  it('should trim whitespace', () => {
    expect(sanitize('  hello  ')).toBe('hello');
  });

  it('should limit length', () => {
    const longText = 'a'.repeat(2000);
    expect(sanitize(longText).length).toBe(1000);
  });
});

describe('parsePath', () => {
  it('should parse category only', () => {
    expect(parsePath('/leads')).toEqual({ category: 'leads', slug: undefined });
    expect(parsePath('leads')).toEqual({ category: 'leads', slug: undefined });
  });

  it('should parse category and slug', () => {
    expect(parsePath('/leads/acme-corp')).toEqual({ category: 'leads', slug: 'acme-corp' });
    expect(parsePath('/job-tracker/january/week-1')).toEqual({
      category: 'job-tracker',
      slug: 'january/week-1',
    });
  });

  it('should handle empty path', () => {
    expect(parsePath('/')).toBeNull();
    expect(parsePath('')).toBeNull();
  });
});
