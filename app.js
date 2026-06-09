import { serve } from 'srvx/node';
import server from './dist/server/server.js';
import path from 'node:path';

serve({
  fetch: server.fetch,
  static: path.resolve('dist/client'),
  port: process.env.PORT || 3000,
});
