import { db } from './index.ts';
import {
  profiles,
  games,
  gameSessions,
  achievements,
  userAchievements,
  supportTickets,
  notifications,
  announcements,
  faqs,
  siteSettings,
  paymentRecords,
  auditLogs,
} from './schema.ts';
import { eq, desc, asc, and, sql } from 'drizzle-orm';

const INITIAL_GAMES = [
  {
    title: 'Memory Match',
    titleUr: 'میموری میچ',
    slug: 'memory-match',
    description: 'Flip ornate geometric cards and match pairs across Easy, Medium, and Hard grids. Tracks moves, completion time, and personal best.',
    descriptionUr: 'خوبصورت جیومیٹرک کارڈز پلٹیں اور جوڑے ملائیں۔ چالوں، وقت اور بہترین اسکور کا ریکارڈ رکھیں۔',
    category: 'Memory',
    thumbnailUrl: '/src/assets/images/game_memory_match_1791626219794.jpg',
    isActive: true,
    isFeatured: true,
  },
  {
    title: 'Quick Tap Reflex',
    titleUr: 'کوئیک ٹیپ ریفلیکس',
    slug: 'quick-tap',
    description: 'Test reaction speed on an emerald target grid with a 30-second countdown, precision combo multipliers, and anti-automation verification.',
    descriptionUr: '30 سیکنڈ کے کاؤنٹ ڈاؤن اور درستگی کے ساتھ اپنی رفتار اور ردعمل کا امتحان لیں۔',
    category: 'Arcade',
    thumbnailUrl: '/src/assets/images/game_quick_tap_1791626232378.jpg',
    isActive: true,
    isFeatured: true,
  },
  {
    title: 'Pakistan Brain Quiz',
    titleUr: 'پاکستان برین کوئز',
    slug: 'brain-quiz',
    description: 'Randomized multiple-choice knowledge challenge covering Pakistani geography, science, cricket history, and general trivia with detailed explanations.',
    descriptionUr: 'پاکستانی جغرافیہ، سائنس، کرکٹ اور معلومات عامہ پر مبنی دلچسپ سوالات اور وضاحت۔',
    category: 'Trivia',
    thumbnailUrl: '/src/assets/images/game_brain_quiz_1791626246599.jpg',
    isActive: true,
    isFeatured: true,
  },
  {
    title: 'Sliding Number Puzzle',
    titleUr: 'نمبر پزل',
    slug: 'number-puzzle',
    description: 'Classic 4x4 sliding numeric logic puzzle. Arrange tiles 1 through 15 in ascending order with minimal moves.',
    descriptionUr: 'کلاسک 4x4 سلائیڈنگ نمبر پزل۔ کم سے کم چالوں میں 1 سے 15 تک نمبرز ترتیب دیں۔',
    category: 'Puzzle',
    thumbnailUrl: '',
    isActive: true,
    isFeatured: false,
  },
  {
    title: 'Tactical Tic-Tac-Toe',
    titleUr: 'ٹیکٹیکل ٹک ٹیک ٹو',
    slug: 'tic-tac-toe',
    description: 'Play against an adaptive Minimax tactical bot or pass-and-play locally across a 3-round series.',
    descriptionUr: 'ذہین کمپیوٹر بوٹ یا دوست کے خلاف تین راؤنڈز کا دلچسپ مقابلہ کھیلیں۔',
    category: 'Strategy',
    thumbnailUrl: '',
    isActive: true,
    isFeatured: false,
  },
  {
    title: 'Daily Emerald Cipher',
    titleUr: 'ڈیلی ایمرالڈ چیلنج',
    slug: 'daily-challenge',
    description: 'Daily deterministic math and pattern sequence challenge. Complete today’s sequence to earn non-cash virtual XP points.',
    descriptionUr: 'روزانہ کا حسابی اور پیٹرن چیلنج مکمل کریں اور ورچوئل ایکس پی پوائنٹس حاصل کریں۔',
    category: 'Daily',
    thumbnailUrl: '',
    isActive: true,
    isFeatured: true,
  },
];

const INITIAL_ACHIEVEMENTS = [
  {
    code: 'FIRST_MATCH',
    title: 'First Arena Step',
    titleUr: 'پہلا قدم',
    description: 'Complete your first verified game session on GameZone PK.',
    descriptionUr: 'گیم زون پی کے پر اپنا پہلا گیم مکمل کریں۔',
    icon: 'Trophy',
    xpReward: 100,
  },
  {
    code: 'MEMORY_MASTER',
    title: 'Grandmaster Recall',
    titleUr: 'یادداشت کا ماہر',
    description: 'Score 600 or higher in Memory Match.',
    descriptionUr: 'میموری میچ میں 600 یا اس سے زیادہ اسکور حاصل کریں۔',
    icon: 'Sparkles',
    xpReward: 250,
  },
  {
    code: 'LIGHTNING_REFLEX',
    title: 'Lahore Lightning',
    titleUr: 'برق رفتار',
    description: 'Achieve a score of 350+ in Quick Tap Reflex.',
    descriptionUr: 'کوئیک ٹیپ ریفلیکس میں 350 سے زائد اسکور بنائیں۔',
    icon: 'Zap',
    xpReward: 250,
  },
  {
    code: 'SCHOLAR_PK',
    title: 'National Scholar',
    titleUr: 'قومی اسکالر',
    description: 'Score 700 or higher in Pakistan Brain Quiz.',
    descriptionUr: 'پاکستان برین کوئز میں 700 یا زیادہ اسکور حاصل کریں۔',
    icon: 'Award',
    xpReward: 300,
  },
  {
    code: 'DAILY_CHALLENGER',
    title: 'Daily Dedication',
    titleUr: 'روزانہ کا چیمپئن',
    description: 'Complete the Daily Emerald Cipher challenge.',
    descriptionUr: 'ڈیلی ایمرالڈ چیلنج مکمل کریں۔',
    icon: 'Shield',
    xpReward: 200,
  },
];

const INITIAL_FAQS = [
  {
    question: 'Are all games on GameZone PK free to play?',
    questionUr: 'کیا گیم زون پی کے پر تمام گیمز مفت ہیں؟',
    answer: 'Yes. All browser games on GameZone PK—including Memory Match, Quick Tap, Brain Quiz, Number Puzzle, Tic-Tac-Toe, and the Daily Challenge—are 100% free to play without depositing any money.',
    answerUr: 'جی ہاں! گیم زون پی کے پر تمام گیمز بنا کسی رقم یا ڈیپازٹ کے بالکل مفت کھیلے جا سکتے ہیں۔',
    sortOrder: 1,
  },
  {
    question: 'Do XP points, badges, or leaderboard positions represent real cash?',
    questionUr: 'کیا ایکس پی پوائنٹس یا لیڈر بورڈ پوزیشن نقد رقم ہیں؟',
    answer: 'No. Experience Points (XP), unlocked badges, and leaderboard rankings are strictly virtual entertainment features. GameZone PK does not offer gambling, betting, or guaranteed income.',
    answerUr: 'نہیں۔ ایکس پی پوائنٹس، بیجز اور لیڈر بورڈ رینکنگ صرف تفریحی ورچوئل فیچرز ہیں۔ یہاں جوا یا شرط لگانے کی اجازت نہیں ہے۔',
    sortOrder: 2,
  },
  {
    question: 'How does Easypaisa Merchant Gateway integration work?',
    questionUr: 'ایزی پیسہ مرچنٹ پیمنٹ گیٹ وے کیسے کام کرتا ہے؟',
    answer: 'GameZone PK connects to the official Easypaisa merchant gateway only when merchant credentials are configured and approved. Never enter your Easypaisa PIN or OTP on any website.',
    answerUr: 'گیم زون پی کے صرف منظور شدہ آفیشل ایزی پیسہ مرچنٹ گیٹ وے استعمال کرتا ہے۔ کبھی بھی اپنا ایزی پیسہ پن یا او ٹی پی درج نہ کریں۔',
    sortOrder: 3,
  },
  {
    question: 'Do I need an account to play games?',
    questionUr: 'کیا گیم کھیلنے کے لیے اکاؤنٹ بنانا ضروری ہے؟',
    answer: 'You can play all public games immediately without an account. Signing in allows you to save your scores to the verified leaderboard, earn XP, unlock achievements, and track support tickets.',
    answerUr: 'آپ اکاؤنٹ بنائے بغیر تمام گیمز کھیل سکتے ہیں۔ لاگ ان کرنے سے آپ کا اسکور لیڈر بورڈ پر محفوظ ہوتا ہے اور آپ کو بیجز ملتے ہیں۔',
    sortOrder: 4,
  },
];

let isSeeded = false;

export async function ensureSeedData() {
  if (isSeeded) return;
  try {
    const existingGames = await db.select().from(games);
    if (existingGames.length === 0) {
      await db.insert(games).values(INITIAL_GAMES).onConflictDoNothing();
    }
    const existingAchievements = await db.select().from(achievements);
    if (existingAchievements.length === 0) {
      await db.insert(achievements).values(INITIAL_ACHIEVEMENTS).onConflictDoNothing();
    }
    const existingFaqs = await db.select().from(faqs);
    if (existingFaqs.length === 0) {
      await db.insert(faqs).values(INITIAL_FAQS);
    }
    const existingAnnouncements = await db.select().from(announcements);
    if (existingAnnouncements.length === 0) {
      await db.insert(announcements).values({
        title: 'Welcome to GameZone PK — Season 1 Skill Arena',
        titleUr: 'گیم زون پی کے سیزن 1 اسکل ایرینا میں خوش آمدید',
        content: 'Play 6 free skill-based HTML5 games, complete the Daily Emerald Cipher, and climb the verified Pakistan leaderboard.',
        contentUr: 'چھ مفت اسکل گیمز کھیلیں، روزانہ کا چیلنج مکمل کریں اور پاکستان لیڈر بورڈ پر اپنا نام بنائیں۔',
        isActive: true,
      });
    }
    const existingSettings = await db.select().from(siteSettings);
    if (existingSettings.length === 0) {
      await db.insert(siteSettings).values([
        { key: 'easypaisa_mode', value: 'pending_approval' },
        { key: 'support_email', value: 'support@gamezonepk.com' },
        { key: 'maintenance_mode', value: 'false' },
        { key: 'responsible_play_notice', value: 'Play responsibly for recreation and skill development. XP and badges are non-cash virtual rewards.' },
      ]).onConflictDoNothing();
    }
    isSeeded = true;
  } catch (error) {
    console.error('Database seed check failed:', error);
    throw new Error('Failed to initialize platform data.', { cause: error });
  }
}

export async function getOrCreateProfile(uid: string, email: string, displayName: string, avatarUrl: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    // Grant initial admin role to platform owner email
    const initialRole = cleanEmail === 'talhamahmood1055@gmail.com' ? 'admin' : 'player';
    const existing = await db.select().from(profiles).where(eq(profiles.uid, uid));
    if (existing.length > 0) {
      if (cleanEmail === 'talhamahmood1055@gmail.com' && existing[0].role !== 'admin') {
        const updated = await db
          .update(profiles)
          .set({ role: 'admin', updatedAt: new Date() })
          .where(eq(profiles.uid, uid))
          .returning();
        return updated[0];
      }
      return existing[0];
    }

    const result = await db
      .insert(profiles)
      .values({
        uid,
        email: cleanEmail,
        username: displayName || 'Player',
        avatarUrl: avatarUrl || '',
        preferredLanguage: 'en',
        role: initialRole,
        xp: 0,
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: { email: cleanEmail, updatedAt: new Date() },
      })
      .returning();

    // Create a welcome notification
    await db.insert(notifications).values({
      userId: uid,
      title: 'Welcome to GameZone PK',
      message: 'Your player profile is active. Complete any free skill game to earn XP and unlock your first badge.',
    });

    return result[0];
  } catch (error) {
    console.error('Error in getOrCreateProfile:', error);
    throw new Error('Database error while loading profile.', { cause: error });
  }
}

export async function getPublicPlatformOverview() {
  try {
    await ensureSeedData();
    const allGames = await db.select().from(games).orderBy(asc(games.id));
    const allAchievements = await db.select().from(achievements).orderBy(asc(achievements.id));
    const allFaqs = await db.select().from(faqs).orderBy(asc(faqs.sortOrder));
    const activeAnnouncements = await db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt));
    const settingsRows = await db.select().from(siteSettings);

    // Calculate actual platform activity counts per game
    const sessions = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.isModerated, false))
      .orderBy(desc(gameSessions.score), asc(gameSessions.durationSeconds));

    const playCounts: Record<string, number> = {};
    for (const s of sessions) {
      playCounts[s.gameSlug] = (playCounts[s.gameSlug] || 0) + 1;
    }

    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    return {
      games: allGames.map((g) => ({
        ...g,
        sessionsPlayed: playCounts[g.slug] || 0,
      })),
      achievements: allAchievements,
      faqs: allFaqs,
      announcements: activeAnnouncements,
      leaderboard: sessions.slice(0, 25),
      settings,
    };
  } catch (error) {
    console.error('Error fetching public overview:', error);
    throw new Error('Unable to load platform data. Please try again.', { cause: error });
  }
}

export async function recordVerifiedGameSession(params: {
  uid: string;
  username: string;
  gameSlug: string;
  score: number;
  durationSeconds: number;
}) {
  try {
    const gameRows = await db.select().from(games).where(eq(games.slug, params.gameSlug));
    if (gameRows.length === 0 || !gameRows[0].isActive) {
      throw new Error('Selected game is not currently active.');
    }
    const game = gameRows[0];

    const inserted = await db
      .insert(gameSessions)
      .values({
        userId: params.uid,
        username: params.username,
        gameId: game.id,
        gameSlug: params.gameSlug,
        score: params.score,
        durationSeconds: params.durationSeconds,
        isModerated: false,
      })
      .returning();

    // Calculate XP earned (non-cash virtual points)
    const earnedXp = Math.max(25, Math.min(200, Math.round(params.score / 5)));

    const profileRows = await db.select().from(profiles).where(eq(profiles.uid, params.uid));
    const currentXp = profileRows[0]?.xp || 0;

    // Check achievements to unlock
    const allAchievements = await db.select().from(achievements);
    const unlockedRows = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, params.uid));
    const unlockedIds = new Set(unlockedRows.map((u) => u.achievementId));

    let bonusXp = 0;
    const newlyUnlocked: string[] = [];

    for (const ach of allAchievements) {
      if (unlockedIds.has(ach.id)) continue;
      let shouldUnlock = false;
      if (ach.code === 'FIRST_MATCH') shouldUnlock = true;
      if (ach.code === 'MEMORY_MASTER' && params.gameSlug === 'memory-match' && params.score >= 600) shouldUnlock = true;
      if (ach.code === 'LIGHTNING_REFLEX' && params.gameSlug === 'quick-tap' && params.score >= 350) shouldUnlock = true;
      if (ach.code === 'SCHOLAR_PK' && params.gameSlug === 'brain-quiz' && params.score >= 700) shouldUnlock = true;
      if (ach.code === 'DAILY_CHALLENGER' && params.gameSlug === 'daily-challenge' && params.score >= 100) shouldUnlock = true;

      if (shouldUnlock) {
        await db.insert(userAchievements).values({
          userId: params.uid,
          achievementId: ach.id,
        });
        bonusXp += ach.xpReward;
        newlyUnlocked.push(ach.title);
        await db.insert(notifications).values({
          userId: params.uid,
          title: `Badge Unlocked: ${ach.title}`,
          message: `You earned the "${ach.title}" badge and +${ach.xpReward} virtual XP!`,
        });
      }
    }

    const updatedProfile = await db
      .update(profiles)
      .set({
        xp: currentXp + earnedXp + bonusXp,
        updatedAt: new Date(),
      })
      .where(eq(profiles.uid, params.uid))
      .returning();

    return {
      session: inserted[0],
      earnedXp: earnedXp + bonusXp,
      newlyUnlocked,
      profile: updatedProfile[0],
    };
  } catch (error) {
    console.error('Error recording game session:', error);
    throw new Error('Could not record game session.', { cause: error });
  }
}

export async function getPlayerDashboardData(uid: string) {
  try {
    const profileRows = await db.select().from(profiles).where(eq(profiles.uid, uid));
    const userSessions = await db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.userId, uid))
      .orderBy(desc(gameSessions.completedAt));

    const userUnlocked = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, uid));

    const userTickets = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, uid))
      .orderBy(desc(supportTickets.createdAt));

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, uid))
      .orderBy(desc(notifications.createdAt));

    const userPayments = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.userId, uid))
      .orderBy(desc(paymentRecords.createdAt));

    // Compute leaderboard rank based on XP across all players
    const allProfiles = await db.select().from(profiles).orderBy(desc(profiles.xp));
    const rankIndex = allProfiles.findIndex((p) => p.uid === uid);

    return {
      profile: profileRows[0],
      sessions: userSessions,
      unlockedAchievements: userUnlocked,
      tickets: userTickets,
      notifications: userNotifications,
      payments: userPayments,
      leaderboardPosition: rankIndex >= 0 ? rankIndex + 1 : null,
      totalRegisteredPlayers: allProfiles.length,
    };
  } catch (error) {
    console.error('Error loading player dashboard:', error);
    throw new Error('Failed to load player dashboard.', { cause: error });
  }
}

export async function updatePlayerProfile(
  uid: string,
  updates: { username?: string; avatarUrl?: string; preferredLanguage?: string; accountStatus?: string }
) {
  try {
    const updated = await db
      .update(profiles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(profiles.uid, uid))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('Error updating player profile:', error);
    throw new Error('Failed to update profile settings.', { cause: error });
  }
}

export async function createSupportTicketRecord(params: {
  userId: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  try {
    const result = await db
      .insert(supportTickets)
      .values({
        userId: params.userId,
        name: params.name,
        email: params.email,
        subject: params.subject,
        message: params.message,
        status: 'open',
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw new Error('Failed to submit support ticket.', { cause: error });
  }
}

export async function markNotificationAsRead(uid: string, notificationId: number) {
  try {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, uid)));
  } catch (error) {
    console.error('Error marking notification read:', error);
    throw new Error('Failed to update notification.', { cause: error });
  }
}

export async function getAdminOverviewData() {
  try {
    const allUsers = await db.select().from(profiles).orderBy(desc(profiles.createdAt));
    const allGames = await db.select().from(games).orderBy(asc(games.id));
    const allSessions = await db.select().from(gameSessions).orderBy(desc(gameSessions.completedAt));
    const allTickets = await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
    const allAnnouncements = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    const allFaqs = await db.select().from(faqs).orderBy(asc(faqs.sortOrder));
    const allPayments = await db.select().from(paymentRecords).orderBy(desc(paymentRecords.createdAt));
    const allAuditLogs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
    const allSettings = await db.select().from(siteSettings);

    return {
      users: allUsers,
      games: allGames,
      sessions: allSessions.slice(0, 100),
      tickets: allTickets,
      announcements: allAnnouncements,
      faqs: allFaqs,
      payments: allPayments,
      auditLogs: allAuditLogs.slice(0, 100),
      settings: allSettings,
    };
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    throw new Error('Failed to load administrator overview.', { cause: error });
  }
}

export async function recordAdminAuditLog(adminUid: string, adminEmail: string, action: string, details: string) {
  try {
    await db.insert(auditLogs).values({
      adminUid,
      adminEmail,
      action,
      details,
    });
  } catch (error) {
    console.error('Error writing audit log:', error);
  }
}

export async function adminUpdateGame(
  gameId: number,
  updates: {
    title?: string;
    titleUr?: string;
    description?: string;
    descriptionUr?: string;
    category?: string;
    thumbnailUrl?: string;
    isActive?: boolean;
    isFeatured?: boolean;
  }
) {
  try {
    const result = await db.update(games).set(updates).where(eq(games.id, gameId)).returning();
    return result[0];
  } catch (error) {
    console.error('Error updating game:', error);
    throw new Error('Failed to update game record.', { cause: error });
  }
}

export async function adminUpdateTicket(ticketId: number, status: string, adminNote: string) {
  try {
    const result = await db
      .update(supportTickets)
      .set({ status, adminNote })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error updating support ticket:', error);
    throw new Error('Failed to update support ticket.', { cause: error });
  }
}

export async function adminCreateAnnouncement(params: {
  title: string;
  titleUr: string;
  content: string;
  contentUr: string;
}) {
  try {
    const result = await db
      .insert(announcements)
      .values({
        ...params,
        isActive: true,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error creating announcement:', error);
    throw new Error('Failed to publish announcement.', { cause: error });
  }
}

export async function adminToggleSessionModeration(sessionId: number, isModerated: boolean) {
  try {
    const result = await db
      .update(gameSessions)
      .set({ isModerated })
      .where(eq(gameSessions.id, sessionId))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error moderating session:', error);
    throw new Error('Failed to moderate leaderboard entry.', { cause: error });
  }
}

export async function adminUpsertSetting(key: string, value: string) {
  try {
    const result = await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value, updatedAt: new Date() },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error updating site setting:', error);
    throw new Error('Failed to update site setting.', { cause: error });
  }
}

export async function adminCreateFaq(params: {
  question: string;
  questionUr: string;
  answer: string;
  answerUr: string;
  sortOrder: number;
}) {
  try {
    const result = await db.insert(faqs).values(params).returning();
    return result[0];
  } catch (error) {
    console.error('Error creating FAQ:', error);
    throw new Error('Failed to create FAQ item.', { cause: error });
  }
}

export async function createEasypaisaOrderRecord(params: {
  userId: string;
  merchantOrderRef: string;
  amountPkr: number;
  purpose: string;
  status: string;
}) {
  try {
    const result = await db
      .insert(paymentRecords)
      .values({
        userId: params.userId,
        merchantOrderRef: params.merchantOrderRef,
        amountPkr: params.amountPkr,
        purpose: params.purpose,
        status: params.status,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Error creating payment order record:', error);
    throw new Error('Failed to initialize payment record.', { cause: error });
  }
}

export async function verifyAndCompleteEasypaisaCallback(params: {
  merchantOrderRef: string;
  providerReference: string;
  amountPkr: number;
  newStatus: 'verified' | 'failed' | 'cancelled';
}) {
  try {
    const existing = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.merchantOrderRef, params.merchantOrderRef));
    if (existing.length === 0) {
      throw new Error('Transaction reference not found.');
    }
    const record = existing[0];
    // Idempotency protection: if already verified, return existing without duplicate mutation
    if (record.status === 'verified') {
      return { record, duplicate: true };
    }
    if (record.amountPkr !== params.amountPkr) {
      throw new Error('Transaction amount mismatch detected.');
    }

    const updated = await db
      .update(paymentRecords)
      .set({
        status: params.newStatus,
        providerReference: params.providerReference,
        updatedAt: new Date(),
      })
      .where(eq(paymentRecords.merchantOrderRef, params.merchantOrderRef))
      .returning();

    return { record: updated[0], duplicate: false };
  } catch (error) {
    console.error('Error processing payment callback:', error);
    throw new Error('Payment callback verification failed.', { cause: error });
  }
}
