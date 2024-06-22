import process from 'process';
import os from 'os';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: '*.test.ts',
  fullyParallel: true,
  forbidOnly: process.env['CI'] === '1',
  workers: os.cpus().length * 2,
  reporter: 'html',
});
