import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { requireAuth, optionalAuth, requireAdmin, AuthRequest } from './src/middleware/auth.ts';
import {
  getPublicPlatformOverview,
  recordVerifiedGameSession,
  getPlayerDashboardData,
  updatePlayerProfile,
  createSupportTicketRecord,
  markNotificationAsRead,
  getAdminOverviewData,
  recordAdminAuditLog,
  adminUpdateGame,
  adminUpdateTicket,
  adminCreateAnnouncement,
  adminToggleSessionModeration,
  adminUpsertSetting,
  adminCreateFaq,
  createEasypaisaOrderRecord,
  verifyAndCompleteEasypaisaCallback,
} from './src/db/queries.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '512kb' }));

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Rate limiter map for sensitive endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'anon'}:${req.path}`;
    const now = Date.now();
    const record = rateLimitMap.get(key);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (record.count >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests in a short window. Please wait a moment before trying again.',
      });
    }
    record.count += 1;
    next();
  };
};

// Duplicate submission guard (idempotency window)
const recentSubmissions = new Map<string, number>();

function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

// SEO routes: robots.txt & sitemap.xml
app.get('/robots.txt', (_req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || 'https://gamezone-pk-talha-talha-5fd4.vercel.app';
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || 'https://gamezone-pk-talha-talha-5fd4.vercel.app';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${baseUrl}/?view=games</loc><changefreq>daily</changefreq><priority>0.9</priority></url>
  <url><loc>${baseUrl}/?view=leaderboard</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>
  <url><loc>${baseUrl}/?view=support</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>${baseUrl}/?view=legal</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`;
  res.type('application/xml').send(xml);
});

// Public platform data
app.get('/api/overview', async (_req: Request, res: Response) => {
  try {
    const data = await getPublicPlatformOverview();
    const easypaisaConfigured = Boolean(
      process.env.EASYPAISA_STORE_ID &&
        process.env.EASYPAISA_HASH_KEY &&
        process.env.EASYPAISA_STORE_ID !== 'YOUR_EASYPAISA_STORE_ID'
    );
    res.json({
      ...data,
      easypaisaGatewayStatus: {
        merchantCredentialsConfigured: easypaisaConfigured,
        sandboxSupported: true,
        mode: data.settings.easypaisa_mode || 'pending_approval',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unable to load platform overview.' });
  }
});

// Authenticated player dashboard & profile
app.get('/api/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const data = await getPlayerDashboardData(req.user.uid);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load player dashboard.' });
  }
});

app.put('/api/profile', requireAuth, rateLimit(10, 60000), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const username = sanitizeText(req.body.username, 40);
    const avatarUrl = sanitizeText(req.body.avatarUrl, 300);
    const preferredLanguage = req.body.preferredLanguage === 'ur' ? 'ur' : 'en';
    const accountStatus = req.body.accountStatus === 'deletion_requested' ? 'deletion_requested' : 'active';

    if (!username || username.length < 2) {
      return res.status(400).json({ error: 'Display name must be at least 2 characters.' });
    }

    const updated = await updatePlayerProfile(req.user.uid, {
      username,
      avatarUrl,
      preferredLanguage,
      accountStatus,
    });
    res.json({ profile: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update profile.' });
  }
});

// Submit verified game session with server-side anti-cheat validation
app.post('/api/sessions', requireAuth, rateLimit(20, 60000), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.profile) {
      return res.status(401).json({ error: 'Sign in required to save leaderboard scores.' });
    }

    const gameSlug = sanitizeText(req.body.gameSlug, 60);
    const score = Number(req.body.score);
    const durationSeconds = Number(req.body.durationSeconds);

    if (!gameSlug || !Number.isFinite(score) || !Number.isFinite(durationSeconds)) {
      return res.status(400).json({ error: 'Invalid game session payload.' });
    }

    // Prevent automated or impossible scores
    if (score < 0 || score > 2500) {
      return res.status(400).json({
        error: 'Score rejected by server-side anti-cheat validator: score out of valid bounds.',
      });
    }
    if (durationSeconds < 3 || durationSeconds > 3600) {
      return res.status(400).json({
        error: 'Session rejected: completion duration is unrealistic or automated.',
      });
    }
    if (gameSlug === 'quick-tap' && score > 1200) {
      return res.status(400).json({
        error: 'Quick Tap score exceeds human reaction speed threshold.',
      });
    }

    // Duplicate submission protection within 4 seconds
    const dedupeKey = `${req.user.uid}:${gameSlug}:${score}`;
    const lastTime = recentSubmissions.get(dedupeKey);
    if (lastTime && Date.now() - lastTime < 4000) {
      return res.status(409).json({ error: 'Duplicate score submission detected.' });
    }
    recentSubmissions.set(dedupeKey, Date.now());

    const result = await recordVerifiedGameSession({
      uid: req.user.uid,
      username: req.profile.username,
      gameSlug,
      score: Math.round(score),
      durationSeconds: Math.round(durationSeconds),
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save game score.' });
  }
});

// Mark notification read
app.post('/api/notifications/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid notification ID.' });
    await markNotificationAsRead(req.user.uid, id);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update notification.' });
  }
});

// Customer support ticket submission (works publicly or logged-in)
app.post('/api/support', optionalAuth, rateLimit(6, 60000), async (req: AuthRequest, res: Response) => {
  try {
    const name = sanitizeText(req.body.name, 80);
    const email = sanitizeText(req.body.email, 120);
    const subject = sanitizeText(req.body.subject, 140);
    const message = sanitizeText(req.body.message, 1500);
    // Honeypot anti-spam field
    if (req.body.websiteUrl) {
      return res.status(400).json({ error: 'Automated spam submission rejected.' });
    }

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Please complete all required form fields (Name, Email, Subject, Message).' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const dedupeKey = `ticket:${email}:${subject}`;
    const lastTime = recentSubmissions.get(dedupeKey);
    if (lastTime && Date.now() - lastTime < 15000) {
      return res.status(409).json({ error: 'Duplicate support ticket submission detected.' });
    }
    recentSubmissions.set(dedupeKey, Date.now());

    const ticket = await createSupportTicketRecord({
      userId: req.user?.uid || null,
      name,
      email,
      subject,
      message,
    });

    res.json({
      ticket,
      emailConfigured: Boolean(process.env.SMTP_HOST),
      notice:
        'Your support ticket has been saved to the GameZone PK database. You can track its status directly in your Player Dashboard.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to submit support ticket.' });
  }
});

// Easypaisa Official Merchant Gateway Integration
app.post('/api/easypaisa/init', requireAuth, rateLimit(8, 60000), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const amountPkr = Number(req.body.amountPkr);
    const purpose = sanitizeText(req.body.purpose || 'Tournament Pass / Supporter Pack', 120);
    const isSandboxTest = Boolean(req.body.isSandboxTest);

    if (!Number.isFinite(amountPkr) || amountPkr < 50 || amountPkr > 50000) {
      return res.status(400).json({
        error: 'Transaction amount must be between PKR 50 and PKR 50,000.',
      });
    }

    const storeId = process.env.EASYPAISA_STORE_ID;
    const hashKey = process.env.EASYPAISA_HASH_KEY;
    const hasProductionMerchantCredentials = Boolean(
      storeId && hashKey && storeId !== 'YOUR_EASYPAISA_STORE_ID'
    );

    const merchantOrderRef = `GZPK-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    if (!hasProductionMerchantCredentials && !isSandboxTest) {
      return res.status(503).json({
        available: false,
        error: 'Payments not yet available: Official Easypaisa merchant account approval and server credentials are required before live PKR transactions can be initialized.',
      });
    }

    const record = await createEasypaisaOrderRecord({
      userId: req.user.uid,
      merchantOrderRef,
      amountPkr: Math.round(amountPkr),
      purpose: isSandboxTest ? `[SANDBOX TEST] ${purpose}` : purpose,
      status: 'pending',
    });

    const hmacSignature = crypto
      .createHmac('sha256', hashKey || 'SANDBOX_DEV_SECRET_KEY')
      .update(`${merchantOrderRef}:${record.amountPkr}:PKR`)
      .digest('hex');

    res.json({
      available: true,
      isSandboxTest,
      order: record,
      signature: hmacSignature,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to initialize payment request.' });
  }
});

// Easypaisa Server-Side Callback Verification (Idempotent & HMAC-Verified)
app.post('/api/easypaisa/callback', requireAuth, rateLimit(15, 60000), async (req: AuthRequest, res: Response) => {
  try {
    const merchantOrderRef = sanitizeText(req.body.merchantOrderRef, 80);
    const providerReference = sanitizeText(req.body.providerReference, 80);
    const amountPkr = Number(req.body.amountPkr);
    const signature = sanitizeText(req.body.signature, 200);
    const outcome = req.body.outcome === 'verified' ? 'verified' : req.body.outcome === 'cancelled' ? 'cancelled' : 'failed';

    if (!merchantOrderRef || !Number.isFinite(amountPkr) || !signature) {
      return res.status(400).json({ error: 'Missing required callback verification fields.' });
    }

    const hashKey = process.env.EASYPAISA_HASH_KEY || 'SANDBOX_DEV_SECRET_KEY';
    const expectedSignature = crypto
      .createHmac('sha256', hashKey)
      .update(`${merchantOrderRef}:${Math.round(amountPkr)}:PKR`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(403).json({
        error: 'Invalid callback signature: cryptographic HMAC verification failed.',
      });
    }

    const result = await verifyAndCompleteEasypaisaCallback({
      merchantOrderRef,
      providerReference: providerReference || `EP-${Date.now()}`,
      amountPkr: Math.round(amountPkr),
      newStatus: outcome,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Callback verification failed.' });
  }
});

// Administrator API routes (Protected by server-verified requireAdmin middleware)
app.get('/api/admin/overview', requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getAdminOverviewData();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load admin dashboard.' });
  }
});

app.put('/api/admin/games/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const gameId = Number(req.params.id);
    if (!Number.isFinite(gameId)) return res.status(400).json({ error: 'Invalid game ID.' });

    const updates: Record<string, any> = {};
    if (typeof req.body.title === 'string') updates.title = sanitizeText(req.body.title, 100);
    if (typeof req.body.titleUr === 'string') updates.titleUr = sanitizeText(req.body.titleUr, 100);
    if (typeof req.body.description === 'string') updates.description = sanitizeText(req.body.description, 500);
    if (typeof req.body.descriptionUr === 'string') updates.descriptionUr = sanitizeText(req.body.descriptionUr, 500);
    if (typeof req.body.category === 'string') updates.category = sanitizeText(req.body.category, 60);
    if (typeof req.body.thumbnailUrl === 'string') updates.thumbnailUrl = sanitizeText(req.body.thumbnailUrl, 300);
    if (typeof req.body.isActive === 'boolean') updates.isActive = req.body.isActive;
    if (typeof req.body.isFeatured === 'boolean') updates.isFeatured = req.body.isFeatured;

    const updated = await adminUpdateGame(gameId, updates);
    await recordAdminAuditLog(
      req.user!.uid,
      req.profile!.email,
      'UPDATE_GAME',
      `Updated game #${gameId} (${updated?.title || ''})`
    );
    res.json({ game: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update game.' });
  }
});

app.put('/api/admin/tickets/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    const status = ['open', 'in_progress', 'resolved'].includes(req.body.status) ? req.body.status : 'open';
    const adminNote = sanitizeText(req.body.adminNote, 600);

    const updated = await adminUpdateTicket(ticketId, status, adminNote);
    await recordAdminAuditLog(
      req.user!.uid,
      req.profile!.email,
      'UPDATE_SUPPORT_TICKET',
      `Ticket #${ticketId} marked as ${status}`
    );
    res.json({ ticket: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update support ticket.' });
  }
});

app.post('/api/admin/announcements', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const title = sanitizeText(req.body.title, 150);
    const titleUr = sanitizeText(req.body.titleUr || title, 150);
    const content = sanitizeText(req.body.content, 800);
    const contentUr = sanitizeText(req.body.contentUr || content, 800);

    if (!title || !content) {
      return res.status(400).json({ error: 'Announcement title and content are required.' });
    }

    const created = await adminCreateAnnouncement({ title, titleUr, content, contentUr });
    await recordAdminAuditLog(
      req.user!.uid,
      req.profile!.email,
      'PUBLISH_ANNOUNCEMENT',
      `Published announcement: ${title}`
    );
    res.json({ announcement: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to publish announcement.' });
  }
});

app.put('/api/admin/sessions/:id/moderate', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = Number(req.params.id);
    const isModerated = Boolean(req.body.isModerated);
    const updated = await adminToggleSessionModeration(sessionId, isModerated);
    await recordAdminAuditLog(
      req.user!.uid,
      req.profile!.email,
      'MODERATE_SCORE',
      `Session #${sessionId} moderation set to ${isModerated}`
    );
    res.json({ session: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to moderate leaderboard score.' });
  }
});

app.put('/api/admin/settings', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const key = sanitizeText(req.body.key, 80);
    const value = sanitizeText(req.body.value, 500);
    if (!key) return res.status(400).json({ error: 'Setting key is required.' });
    const setting = await adminUpsertSetting(key, value);
    await recordAdminAuditLog(
      req.user!.uid,
      req.profile!.email,
      'UPDATE_SETTING',
      `Updated setting ${key}`
    );
    res.json({ setting });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update setting.' });
  }
});

app.post('/api/admin/faqs', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const question = sanitizeText(req.body.question, 250);
    const questionUr = sanitizeText(req.body.questionUr || question, 250);
    const answer = sanitizeText(req.body.answer, 1000);
    const answerUr = sanitizeText(req.body.answerUr || answer, 1000);
    const sortOrder = Number(req.body.sortOrder) || 10;

    if (!question || !answer) {
      return res.status(400).json({ error: 'FAQ question and answer are required.' });
    }
    const created = await adminCreateFaq({ question, questionUr, answer, answerUr, sortOrder });
    await recordAdminAuditLog(req.user!.uid, req.profile!.email, 'ADD_FAQ', `Added FAQ: ${question}`);
    res.json({ faq: created });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add FAQ.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GameZone PK server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
