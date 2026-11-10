import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { initDatabase, ensureFounderAccount } from './server/src/db/database';
import authRoutes from './server/src/routes/auth.routes';
import adminRoutes from './server/src/routes/admin.routes';
import profileRoutes from './server/src/routes/profile.routes';
import discoverRoutes from './server/src/routes/discover.routes';
import matchRoutes from './server/src/routes/match.routes';
import chatRoutes from './server/src/routes/chat.routes';
import moderationRoutes from './server/src/routes/moderation.routes';

// Initialize Database, Tables & Founder Account
initDatabase();
ensureFounderAccount().catch((err) => console.error('Error ensuring founder account:', err));

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure storage directories exist
const AVATAR_DIR = path.resolve(process.cwd(), 'storage', 'public_avatars');
const PRIVATE_ID_DIR = path.resolve(process.cwd(), 'storage', 'private_ids');

if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
if (!fs.existsSync(PRIVATE_ID_DIR)) fs.mkdirSync(PRIVATE_ID_DIR, { recursive: true });

// Security headers middleware
app.use((_req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static public avatars
app.use('/uploads/avatars', express.static(AVATAR_DIR));
app.use('/uploads', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Asset not found.' });
});

// API Routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    app: 'PCTE MATCH',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/moderation', moderationRoutes);

// Fallback 404 for unmatched API endpoints
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found.' });
});

// Global API error handler
app.use('/api', (err: any, _req: Request, res: Response, _next: any) => {
  console.error('[API Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'An internal server error occurred.'
  });
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PCTE MATCH] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
