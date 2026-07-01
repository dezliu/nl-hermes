import { describe, it, expect } from 'vitest';
import { createServiceApp } from './server.js';

describe('createServiceApp', () => {
  it('creates express app with health route', () => {
    const app = createServiceApp('test');
    expect(app).toBeTruthy();
  });
});
