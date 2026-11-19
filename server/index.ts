import 'dotenv/config';

import type { Express } from 'express';

import { createApp } from './app.js';
import { resolvePort } from './config.js';

const app: Express = createApp();
const port: number = resolvePort(process.env.PORT);

app.listen(port, (): void => {
  console.info(`Server is listening on port ${port}`);
});
