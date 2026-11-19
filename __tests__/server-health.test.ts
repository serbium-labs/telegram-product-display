import request, { type Response } from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../server/app.js';

const HTTP_OK_STATUS = 200;

describe('server foundation', (): void => {
  it('reports that the API is running', async (): Promise<void> => {
    const response: Response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(HTTP_OK_STATUS);
    expect(response.text).toBe('API is running');
  });
});
