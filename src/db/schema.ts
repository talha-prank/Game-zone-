import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  username: text('username').notNull(),
  avatarUrl: text('avatar_url').default(''),
  preferredLanguage: text('preferred_language').default('en').notNull(),
  role: text('role').default('player').notNull(), // 'player' | 'admin'
  xp: integer('xp').default(0).notNull(),
  accountStatus: text('account_status').default('active').notNull(), // 'active' | 'deletion_requested'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  titleUr: text('title_ur').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  descriptionUr: text('description_ur').notNull(),
  category: text('category').notNull(),
  thumbnailUrl: text('thumbnail_url').default('').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isFeatured: boolean('is_featured').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const gameSessions = pgTable('game_sessions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Firebase UID
  username: text('username').notNull(),
  gameId: integer('game_id').references(() => games.id).notNull(),
  gameSlug: text('game_slug').notNull(),
  score: integer('score').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  isModerated: boolean('is_moderated').default(false).notNull(),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
});

export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  titleUr: text('title_ur').notNull(),
  description: text('description').notNull(),
  descriptionUr: text('description_ur').notNull(),
  icon: text('icon').notNull(),
  xpReward: integer('xp_reward').notNull(),
});

export const userAchievements = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  achievementId: integer('achievement_id').references(() => achievements.id).notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
});

export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  userId: text('user_id'), // Nullable for public contact form submissions
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').default('open').notNull(), // 'open' | 'in_progress' | 'resolved'
  adminNote: text('admin_note').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  titleUr: text('title_ur').notNull(),
  content: text('content').notNull(),
  contentUr: text('content_ur').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  questionUr: text('question_ur').notNull(),
  answer: text('answer').notNull(),
  answerUr: text('answer_ur').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const paymentRecords = pgTable('payment_records', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  merchantOrderRef: text('merchant_order_ref').notNull().unique(),
  amountPkr: integer('amount_pkr').notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'verified' | 'failed' | 'cancelled'
  providerReference: text('provider_reference').default(''),
  purpose: text('purpose').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  adminUid: text('admin_uid').notNull(),
  adminEmail: text('admin_email').notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const gamesRelations = relations(games, ({ many }) => ({
  sessions: many(gameSessions),
}));

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  game: one(games, {
    fields: [gameSessions.gameId],
    references: [games.id],
  }),
}));
