import { describe, it, expect } from 'vitest';
import { config } from '@/config/env';

describe('env config', () => {
  it('has correct configuration structure', () => {
    expect(config).toHaveProperty('isDevelopment');
    expect(config).toHaveProperty('isProduction');
    expect(config).toHaveProperty('isTest');
    expect(config).toHaveProperty('debug');
    expect(config).toHaveProperty('supabase');
    expect(config).toHaveProperty('alphaVantage');
    expect(config).toHaveProperty('app');
  });

  it('has correct supabase configuration', () => {
    expect(config.supabase).toHaveProperty('url');
    expect(config.supabase).toHaveProperty('anonKey');
    expect(typeof config.supabase.url).toBe('string');
    expect(typeof config.supabase.anonKey).toBe('string');
  });

  it('has correct alpha vantage configuration', () => {
    expect(config.alphaVantage).toHaveProperty('apiKey');
    expect(config.alphaVantage).toHaveProperty('baseUrl');
    expect(typeof config.alphaVantage.apiKey).toBe('string');
    expect(config.alphaVantage.baseUrl).toBe('https://www.alphavantage.co/query');
  });

  it('has correct app configuration', () => {
    expect(config.app).toHaveProperty('name');
    expect(config.app).toHaveProperty('version');
    expect(config.app.name).toBe('NetWorth Tracker');
    expect(config.app.version).toBe('1.0.0');
  });
});
