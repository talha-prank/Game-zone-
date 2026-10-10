import React, { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import { GameArena } from './components/GameArena.tsx';
import { PlayerDashboard } from './components/PlayerDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import {
  Search,
  Trophy,
  Award,
  ShieldCheck,
  HelpCircle,
  Mail,
  Globe,
  Play,
  LogIn,
  X,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

type ActiveView = 'home' | 'play' | 'dashboard' | 'admin' | 'legal' | 'not_found';

export default function App() {
  const [view, setView] = useState<ActiveView>(() => {
    const path = window.location.pathname;
    if (path === '/admin') return 'admin';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/legal') return 'legal';
    if (path !== '/' && path !== '/index.html') return 'not_found';
    return 'home';
  });

  const [selectedGameSlug, setSelectedGameSlug] = useState<string>('memory-match');
  const [lang, setLang] = useState<'en' | 'ur'>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [leaderboardFilter, setLeaderboardFilter] = useState('All');

  // Firebase Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'reset'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Platform overview data
  const [loadingPlatform, setLoadingPlatform] = useState(true);
  const [platformError, setPlatformError] = useState<string | null>(null);
  const [overview, setOverview] = useState<{
    games: any[];
    achievements: any[];
    faqs: any[];
    announcements: any[];
    leaderboard: any[];
    settings: Record<string, string>;
    easypaisaGatewayStatus: {
      merchantCredentialsConfigured: boolean;
      sandboxSupported: boolean;
      mode: string;
    };
  }>({
    games: [],
    achievements: [],
    faqs: [],
    announcements: [],
    leaderboard: [],
    settings: {},
    easypaisaGatewayStatus: {
      merchantCredentialsConfigured: false,
      sandboxSupported: true,
      mode: 'pending_approval',
    },
  });

  // Contact Support Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactHoneypot, setContactHoneypot] = useState('');
  const [contactStatus, setContactStatus] = useState<{
    submitting: boolean;
    success?: string;
    error?: string;
  }>({ submitting: false });

  // Legal Sub-tab
  const [legalTab, setLegalTab] = useState<'privacy' | 'terms' | 'responsible' | 'refund'>('privacy');

  const fetchOverview = async () => {
    setPlatformError(null);
    try {
      const res = await fetch('/api/overview');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load platform data.');
      setOverview(json);
    } catch (err: any) {
      setPlatformError(err.message || 'Network error while connecting to GameZone PK server.');
    } finally {
      setLoadingPlatform(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
        setContactName(user.displayName || '');
        setContactEmail(user.email || '');
      } else {
        setIdToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const navigateTo = (target: ActiveView, pushPath = '/') => {
    setView(target);
    window.history.pushState({}, '', pushPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLaunchGame = (slug: string) => {
    setSelectedGameSlug(slug);
    navigateTo('play', `/?game=${slug}`);
  };

  const handleSaveScore = async (gameSlug: string, score: number, durationSeconds: number) => {
    if (!currentUser) {
      return { error: 'Not signed in.' };
    }
    try {
      const freshToken = await currentUser.getIdToken();
      setIdToken(freshToken);
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({ gameSlug, score, durationSeconds }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { error: json.error || 'Could not verify score.' };
      }
      fetchOverview();
      return {
        earnedXp: json.earnedXp,
        newlyUnlocked: json.newlyUnlocked,
      };
    } catch (err: any) {
      return { error: err.message || 'Network error while saving score.' };
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthNotice(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      setAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-In could not complete.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthNotice(null);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        setAuthModalOpen(false);
      } else if (authMode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        try {
          await sendEmailVerification(cred.user);
          setAuthNotice('Account created and verification email dispatched.');
        } catch {
          setAuthNotice('Account created.');
        }
        setAuthModalOpen(false);
      } else if (authMode === 'reset') {
        await sendPasswordResetEmail(auth, authEmail);
        setAuthNotice('Password reset instructions sent to your email address.');
      }
    } catch (err: any) {
      setAuthError(
        err.code === 'auth/operation-not-allowed'
          ? 'Email/Password provider is not enabled in the Firebase Console yet. Please use Google Sign-In above.'
          : err.message || 'Authentication failed. Please check your credentials.'
      );
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus({ submitting: true });
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idToken) headers.Authorization = `Bearer ${idToken}`;
      const res = await fetch('/api/support', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          subject: contactSubject,
          message: contactMessage,
          websiteUrl: contactHoneypot,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setContactStatus({ submitting: false, error: json.error || 'Submission failed.' });
        return;
      }
      setContactSubject('');
      setContactMessage('');
      setContactStatus({
        submitting: false,
        success: json.notice || 'Support ticket saved to database.',
      });
    } catch (err: any) {
      setContactStatus({
        submitting: false,
        error: err.message || 'Network error while submitting support request.',
      });
    }
  };

  const activeGames = overview.games.filter((g) => g.isActive);
  const categories = ['All', ...Array.from(new Set(activeGames.map((g) => g.category)))];

  const filteredGames = activeGames.filter((g) => {
    const matchesCat = selectedCategory === 'All' || g.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const featuredGames = activeGames.filter((g) => g.isFeatured);
  const popularGames = [...activeGames].sort((a, b) => (b.sessionsPlayed || 0) - (a.sessionsPlayed || 0));
  const filteredLeaderboard =
    leaderboardFilter === 'All'
      ? overview.leaderboard
      : overview.leaderboard.filter((s) => s.gameSlug === leaderboardFilter);

  const isAdminUser = currentUser?.email?.toLowerCase() === 'talhamahmood1055@gmail.com';

  return (
    <div dir={lang === 'ur' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 bg-[#090D16]/95 backdrop-blur border-b border-slate-800/80 flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('home', '/');
          }}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 font-display"
        >
          GameZone PK
        </a>

        {/* Zone 2: 4–5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <a
            href="#games"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home', '/');
              setTimeout(() => document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' }), 50);
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'ur' ? 'گیمز' : 'Games'}
          </a>
          <a
            href="#daily-challenge"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home', '/');
              setTimeout(() => document.getElementById('daily-challenge')?.scrollIntoView({ behavior: 'smooth' }), 50);
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'ur' ? 'ڈیلی چیلنج' : 'Challenges'}
          </a>
          <a
            href="#leaderboard"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home', '/');
              setTimeout(() => document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth' }), 50);
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'ur' ? 'لیڈر بورڈ' : 'Leaderboard'}
          </a>
          <a
            href="#support"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home', '/');
              setTimeout(() => document.getElementById('support')?.scrollIntoView({ behavior: 'smooth' }), 50);
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'ur' ? 'سپورٹ' : 'Support'}
          </a>
          {isAdminUser && (
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('admin', '/admin');
              }}
              className="text-amber-400 hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Admin
            </a>
          )}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <button
              onClick={() => navigateTo('dashboard', '/dashboard')}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'ur' ? 'پلیئر ڈیش بورڈ' : 'Player Dashboard'}
            </button>
          ) : (
            <button
              onClick={() => {
                setAuthMode('login');
                setAuthModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'ur' ? 'سائن ان کریں' : 'Sign In'}
            </button>
          )}
        </div>
      </header>

      {/* Workspace / Language & Quick Utility Toolbar Below Header */}
      <div className="bg-[#0D1320] border-b border-slate-800/70 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Pakistan Skill Gaming Arena</span>
            <span>·</span>
            <span>Currency: PKR</span>
            <span>·</span>
            <span>100% Free-to-Play Browser Games</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-md">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLang('ur')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  lang === 'ur' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                اردو (Urdu)
              </button>
            </div>
            {currentUser && (
              <button
                onClick={() => navigateTo('admin', '/admin')}
                className="text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Admin Console
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1">
        {platformError && (
          <div className="max-w-7xl mx-auto mt-6 px-6">
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center justify-between">
              <span>{platformError}</span>
              <button
                onClick={fetchOverview}
                className="px-3 py-1 bg-red-900 hover:bg-red-800 text-white rounded-md font-medium"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* VIEW: ACTIVE GAME ARENA */}
        {view === 'play' && (
          <GameArena
            gameSlug={selectedGameSlug}
            lang={lang}
            isAuthenticated={Boolean(currentUser)}
            onSaveScore={handleSaveScore}
            onBack={() => navigateTo('home', '/')}
          />
        )}

        {/* VIEW: PLAYER DASHBOARD */}
        {view === 'dashboard' && (
          <PlayerDashboard
            idToken={idToken}
            lang={lang}
            allAchievements={overview.achievements}
            easypaisaStatus={overview.easypaisaGatewayStatus}
            onSignOut={async () => {
              await signOut(auth);
              navigateTo('home', '/');
            }}
          />
        )}

        {/* VIEW: ADMIN DASHBOARD */}
        {view === 'admin' && (
          <AdminDashboard idToken={idToken} onRefreshPublic={fetchOverview} />
        )}

        {/* VIEW: LEGAL & POLICIES */}
        {view === 'legal' && (
          <div className="max-w-4xl mx-auto py-12 px-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Governance, Privacy & Responsible Play Policies
            </h1>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#111827] border border-slate-800 rounded-lg mb-6">
              {(
                [
                  { id: 'privacy', label: 'Privacy & Data Retention' },
                  { id: 'terms', label: 'Terms of Service' },
                  { id: 'responsible', label: 'Responsible Gaming Statement' },
                  { id: 'refund', label: 'Easypaisa Payment & Refund Policy' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setLegalTab(t.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    legalTab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6 sm:p-8 rounded-xl bg-[#111827] border border-slate-800 text-sm text-slate-300 space-y-4 leading-relaxed">
              {legalTab === 'privacy' && (
                <>
                  <h2 className="text-lg font-bold text-white">Privacy Policy & Data Retention</h2>
                  <p>
                    GameZone PK collects only the minimal personal information necessary to operate your player profile, maintain verified national leaderboards, and respond to customer support tickets: your email address, chosen display name, optional profile picture URL, and game session scores.
                  </p>
                  <p>
                    <strong className="text-white">Zero Financial Credential Storage:</strong> GameZone PK never asks for, collects, or stores your Easypaisa PIN, banking password, card CVV, or One-Time Password (OTP).
                  </p>
                  <p>
                    <strong className="text-white">Account Deletion & Retention:</strong> Players can submit an Account Deletion Request directly inside the Player Dashboard under Account Settings. Upon verification, personal profile records are purged within 14 business days.
                  </p>
                </>
              )}
              {legalTab === 'terms' && (
                <>
                  <h2 className="text-lg font-bold text-white">Terms of Service</h2>
                  <p>
                    By accessing GameZone PK, you agree to participate fairly in skill-based browser games. Automated scripts, macros, or packet tampering on score submission endpoints are prohibited and automatically rejected by server-side anti-cheat validation.
                  </p>
                  <p>
                    Experience Points (XP), unlocked badges, and leaderboard rankings are virtual recreational markers with zero monetary or cash redemption value.
                  </p>
                </>
              )}
              {legalTab === 'responsible' && (
                <>
                  <h2 className="text-lg font-bold text-white">Responsible Gaming Statement</h2>
                  <p>
                    GameZone PK is strictly a free-to-play skill and logic gaming platform built for healthy recreation, cognitive exercise, and friendly leaderboard competition in Pakistan.
                  </p>
                  <p>
                    We strictly prohibit gambling, betting, chance-based wagering, or guaranteed daily cash return schemes. Never treat gaming as a source of financial income, and take regular breaks during extended play sessions.
                  </p>
                </>
              )}
              {legalTab === 'refund' && (
                <>
                  <h2 className="text-lg font-bold text-white">Easypaisa Merchant Payment & Dispute Policy</h2>
                  <p>
                    Live PKR payments are only enabled when official Easypaisa merchant approval and server credentials are active. All transactions generate a unique Merchant Order Reference (<code className="text-emerald-400">GZPK-...</code>) and require cryptographic server-side callback verification before completion.
                  </p>
                  <p>
                    In the event of a duplicate debit or failed merchant callback, submit your Order Reference via the Customer Support desk for administrative reconciliation and refund review within 5–7 business days.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* VIEW: 404 NOT FOUND */}
        {view === 'not_found' && (
          <div className="max-w-xl mx-auto py-20 px-6 text-center">
            <p className="text-xs font-mono text-amber-400 mb-2">HTTP 404 · Page Not Found</p>
            <h1 className="text-2xl font-bold text-white mb-3">
              The requested arena page could not be found
            </h1>
            <p className="text-sm text-slate-400 mb-6">
              Check the URL or return to the GameZone PK main lobby to play free browser games.
            </p>
            <button
              onClick={() => navigateTo('home', '/')}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
            >
              Return to Home Page
            </button>
          </div>
        )}

        {/* VIEW: HOME PAGE (ALL 12 REQUIRED SECTIONS) */}
        {view === 'home' && (
          <div className="space-y-16 pb-16">
            {/* 1 & 2. HERO SECTION + PLAY NOW CTA */}
            <section className="pt-8 sm:pt-12 px-4 sm:px-6 max-w-7xl mx-auto">
              {overview.announcements.length > 0 && (
                <div className="mb-6 px-4 py-2.5 rounded-lg bg-[#111827] border border-slate-800 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong className="text-amber-400 font-semibold">
                      {lang === 'ur' ? overview.announcements[0].titleUr : overview.announcements[0].title}:
                    </strong>{' '}
                    {lang === 'ur' ? overview.announcements[0].contentUr : overview.announcements[0].content}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-7 flex flex-col justify-center py-4">
                  <p className="text-xs text-emerald-400 font-medium mb-3">
                    {lang === 'ur'
                      ? 'پاکستان کا معیاری فری ٹو پلے اسکل گیمنگ پلیٹ فارم'
                      : 'Pakistan’s Skill-Based Free-to-Play Gaming Platform · English & Urdu'}
                  </p>
                  <h1
                    className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-5"
                    style={{ textWrap: 'balance' }}
                  >
                    {lang === 'ur'
                      ? 'گیم زون پی کے میں اپنی ذہانت اور رفتار کا امتحان لیں'
                      : 'Master Reflex, Memory & Knowledge in Pakistan’s Skill Arena'}
                  </h1>
                  <p className="text-base text-slate-300 leading-relaxed mb-8 max-w-2xl">
                    {lang === 'ur'
                      ? 'بنا کسی ڈپازٹ کے فوری براؤزر گیمز کھیلیں، روزانہ کے چیلنجز مکمل کریں اور تصدیق شدہ قومی لیڈر بورڈ پر اپنی پوزیشن بنائیں۔'
                      : 'Play instant browser-based skill games with zero deposit required. Compete in Memory Match, Quick Tap Reflex, and Pakistan Brain Quiz with server-verified leaderboards and virtual XP badges.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleLaunchGame('memory-match')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{lang === 'ur' ? 'ابھی کھیلیں (Play Now)' : 'Play Now — Free Arena'}</span>
                    </button>
                    <a
                      href="#games"
                      className="px-5 py-3 bg-[#111827] hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {lang === 'ur' ? 'تمام گیمز دیکھیں' : 'Explore All 6 Games'}
                    </a>
                  </div>
                </div>

                <div className="lg:col-span-5">
                  <div className="relative h-full min-h-[280px] rounded-xl overflow-hidden border border-slate-800 bg-[#111827]">
                    <img
                      src="/src/assets/images/hero_gamezone_pk_1791626205682.jpg"
                      alt="GameZone PK Competitive Skill Gaming Arena"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-6">
                      <p className="text-xs text-amber-300 font-mono mb-1">
                        Verified Anti-Cheat Scoring · Instant Browser Play
                      </p>
                      <p className="text-sm font-semibold text-white">
                        Designed for Android, iPhone, Tablet & Desktop across Pakistan
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 3, 4 & 5. FEATURED, POPULAR & RECENTLY ADDED GAMES WITH SEARCH & FILTERS */}
            <section id="games" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {lang === 'ur' ? 'فری ٹو پلے گیمز لابی' : 'Free-to-Play Skill Games Catalog'}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {lang === 'ur'
                      ? 'تمام گیمز بنا کسی فیس یا رقم کے فوری کھیلیں'
                      : 'Browse featured, recently added, and popular games ranked by real database session activity'}
                  </p>
                </div>

                {/* Search & Category Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={lang === 'ur' ? 'گیم تلاش کریں...' : 'Search games...'}
                      aria-label="Search games"
                      className="pl-9 pr-4 py-2 rounded-lg bg-[#111827] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-[#111827] border border-slate-800 rounded-lg overflow-x-auto">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                          selectedCategory === cat
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loadingPlatform ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-72 rounded-xl bg-[#111827] border border-slate-800 animate-pulse p-6" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredGames.map((game) => (
                    <div
                      key={game.id}
                      className="rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-colors overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-44 bg-slate-900 relative overflow-hidden border-b border-slate-800">
                          {game.thumbnailUrl ? (
                            <img
                              src={game.thumbnailUrl}
                              alt={game.title}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
                              <Trophy className="w-8 h-8 text-amber-400 mb-2" />
                              <span className="text-sm font-bold text-white">{game.title}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          {/* Unboxed clean metadata line */}
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-mono tabular-nums">
                            <span className="text-emerald-400 font-sans font-medium">{game.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>{game.sessionsPlayed || 0} Verified Plays</span>
                            {game.isFeatured && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-400 font-sans">Featured</span>
                              </>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-white mb-2">
                            {lang === 'ur' ? game.titleUr : game.title}
                          </h3>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {lang === 'ur' ? game.descriptionUr : game.description}
                          </p>
                        </div>
                      </div>
                      <div className="px-5 pb-5 pt-2">
                        <button
                          onClick={() => handleLaunchGame(game.slug)}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                        >
                          {lang === 'ur' ? 'گیم کھیلیں' : `Play ${game.title}`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Popular Activity & Recently Added Summary Strip */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-[#111827] border border-slate-800">
                  <h3 className="text-sm font-bold text-white mb-3">
                    {lang === 'ur' ? 'مقبول گیمز (حقیقی سرگرمی کے مطابق)' : 'Most Played Games (Actual Platform Activity)'}
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {popularGames.slice(0, 3).map((g, i) => (
                      <div key={g.id} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0">
                        <span className="text-slate-200 font-medium">
                          0{i + 1}. {lang === 'ur' ? g.titleUr : g.title}
                        </span>
                        <span className="font-mono tabular-nums text-emerald-400">
                          {g.sessionsPlayed || 0} completed sessions
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-[#111827] border border-slate-800">
                  <h3 className="text-sm font-bold text-white mb-3">
                    {lang === 'ur' ? 'حال ہی میں شامل کیے گئے گیمز' : 'Recently Added Skill Games'}
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {activeGames.slice(-3).map((g) => (
                      <div key={g.id} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0">
                        <div>
                          <span className="text-slate-200 font-medium">
                            {lang === 'ur' ? g.titleUr : g.title}
                          </span>
                          <span className="mx-2 text-slate-600">·</span>
                          <span className="text-slate-400">{g.category}</span>
                        </div>
                        <button
                          onClick={() => handleLaunchGame(g.slug)}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          Launch
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 6. DAILY CHALLENGES AWARDING NON-CASH VIRTUAL POINTS */}
            <section id="daily-challenge" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="p-6 sm:p-8 rounded-xl bg-[#111827] border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <p className="text-xs font-mono text-amber-400 mb-2">
                    Daily Skill Challenge · Non-Cash Virtual XP Reward (+200 Bonus XP)
                  </p>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {lang === 'ur'
                      ? 'ڈیلی ایمرالڈ سائفر چیلنج'
                      : 'Today’s Daily Challenge: The Emerald Arithmetic Cipher'}
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {lang === 'ur'
                      ? 'روزانہ تین نئے حسابی اور منطقی مراحل حل کریں اور اپنے پروفائل کے لیے ورچوئل ایکس پی اور ڈیلی چیمپئن بیج حاصل کریں۔'
                      : 'Solve three deterministic mental math sequences generated for today’s date. Earn non-cash virtual XP points and unlock the Daily Dedication badge on your profile.'}
                  </p>
                </div>
                <div className="shrink-0">
                  <button
                    onClick={() => handleLaunchGame('daily-challenge')}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {lang === 'ur' ? 'آج کا چیلنج شروع کریں' : 'Start Today’s Challenge'}
                  </button>
                </div>
              </div>
            </section>

            {/* 7 & 8. VERIFIED LEADERBOARD & PLAYER ACHIEVEMENTS */}
            <section id="leaderboard" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Leaderboard Table */}
                <div className="lg:col-span-7">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {lang === 'ur' ? 'تصدیق شدہ قومی لیڈر بورڈ' : 'Verified National Leaderboard'}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Real server-validated player sessions · Sorted by highest score and fastest completion
                      </p>
                    </div>
                    <select
                      value={leaderboardFilter}
                      onChange={(e) => setLeaderboardFilter(e.target.value)}
                      aria-label="Filter leaderboard by game"
                      className="px-3 py-1.5 rounded-lg bg-[#111827] border border-slate-800 text-xs text-white"
                    >
                      <option value="All">All Games</option>
                      {activeGames.map((g) => (
                        <option key={g.slug} value={g.slug}>
                          {g.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
                    {filteredLeaderboard.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-sm text-slate-300 font-medium mb-1">
                          No verified scores logged for this filter yet
                        </p>
                        <p className="text-xs text-slate-400 mb-4">
                          Sign in and complete any free game to claim the #1 rank on the leaderboard.
                        </p>
                        <button
                          onClick={() => handleLaunchGame('memory-match')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                        >
                          Play & Record First Score
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-slate-800 text-xs text-slate-400">
                              <th className="py-3 px-4">Rank</th>
                              <th className="py-3 px-4">Player</th>
                              <th className="py-3 px-4">Game</th>
                              <th className="py-3 px-4 text-right">Score</th>
                              <th className="py-3 px-4 text-right">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums text-xs">
                            {filteredLeaderboard.slice(0, 10).map((row, idx) => (
                              <tr key={row.id} className="hover:bg-slate-900/40">
                                <td className="py-3 px-4 font-bold text-amber-400">#{idx + 1}</td>
                                <td className="py-3 px-4 font-sans font-medium text-white">{row.username}</td>
                                <td className="py-3 px-4 font-sans text-slate-300">{row.gameSlug}</td>
                                <td className="py-3 px-4 text-right font-bold text-emerald-400">{row.score}</td>
                                <td className="py-3 px-4 text-right text-slate-400">{row.durationSeconds}s</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Achievements & Badges Showcase */}
                <div className="lg:col-span-5">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-white">
                      {lang === 'ur' ? 'کھلاڑیوں کے اعزازات اور بیجز' : 'Player Achievements & Virtual Badges'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Unlock milestones to earn non-cash virtual XP on your profile
                    </p>
                  </div>
                  <div className="space-y-3">
                    {overview.achievements.map((ach) => (
                      <div
                        key={ach.id}
                        className="p-4 rounded-xl bg-[#111827] border border-slate-800 flex items-start justify-between gap-4"
                      >
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {lang === 'ur' ? ach.titleUr : ach.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {lang === 'ur' ? ach.descriptionUr : ach.description}
                          </p>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-amber-400 shrink-0">
                          +{ach.xpReward} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 9. HOW TO PLAY */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="text-xl font-bold text-white mb-6">
                {lang === 'ur' ? 'کھیلنے کا طریقہ کار' : 'How to Play on GameZone PK'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-xl bg-[#111827] border border-slate-800">
                  <p className="text-xs font-mono text-emerald-400 mb-2">01. Instant Free Access</p>
                  <h3 className="text-base font-bold text-white mb-2">Choose Any Skill Game</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Select from Memory Match, Quick Tap Reflex, Pakistan Brain Quiz, Sliding Number Puzzle, or Tactical Tic-Tac-Toe directly in your browser without paying or depositing money.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-[#111827] border border-slate-800">
                  <p className="text-xs font-mono text-emerald-400 mb-2">02. Verified Authentication</p>
                  <h3 className="text-base font-bold text-white mb-2">Sign In to Track Progress</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Create a free account or sign in with Google to save your personal bests, unlock achievement badges, and submit scores to the server-validated leaderboard.
                  </p>
                </div>
                <div className="p-6 rounded-xl bg-[#111827] border border-slate-800">
                  <p className="text-xs font-mono text-emerald-400 mb-2">03. Fair Play & Virtual XP</p>
                  <h3 className="text-base font-bold text-white mb-2">Climb the Pakistan Standings</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Every score is checked by our server-side validator to prevent automated bots. Earn virtual XP and compete fairly with players across Pakistan.
                  </p>
                </div>
              </div>
            </section>

            {/* 10 & 11. FREQUENTLY ASKED QUESTIONS & CUSTOMER SUPPORT */}
            <section id="support" className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* FAQ Column */}
                <div className="lg:col-span-6">
                  <h2 className="text-xl font-bold text-white mb-4">
                    {lang === 'ur' ? 'اکثر پوچھے گئے سوالات (FAQ)' : 'Frequently Asked Questions'}
                  </h2>
                  <div className="space-y-3">
                    {overview.faqs.map((f) => (
                      <div key={f.id} className="p-5 rounded-xl bg-[#111827] border border-slate-800">
                        <h3 className="text-sm font-bold text-white mb-2">
                          {lang === 'ur' ? f.questionUr : f.question}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {lang === 'ur' ? f.answerUr : f.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Support Ticket Form */}
                <div className="lg:col-span-6">
                  <h2 className="text-xl font-bold text-white mb-4">
                    {lang === 'ur' ? 'کسٹمر سپورٹ اور رابطہ' : 'Contact & Customer Support'}
                  </h2>
                  <form
                    onSubmit={handleSupportSubmit}
                    className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4"
                  >
                    <p className="text-xs text-slate-400">
                      Submit a support ticket directly to our PostgreSQL database. Signed-in players can track real-time ticket resolution status inside their Player Dashboard.
                    </p>
                    {/* Anti-spam honeypot */}
                    <input
                      type="text"
                      value={contactHoneypot}
                      onChange={(e) => setContactHoneypot(e.target.value)}
                      className="hidden"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="support-name" className="block text-xs text-slate-300 mb-1">
                          {lang === 'ur' ? 'آپ کا نام' : 'Your Name'}
                        </label>
                        <input
                          id="support-name"
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="support-email" className="block text-xs text-slate-300 mb-1">
                          {lang === 'ur' ? 'ای میل ایڈریس' : 'Email Address'}
                        </label>
                        <input
                          id="support-email"
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="support-subject" className="block text-xs text-slate-300 mb-1">
                        {lang === 'ur' ? 'موضوع' : 'Subject'}
                      </label>
                      <input
                        id="support-subject"
                        type="text"
                        required
                        value={contactSubject}
                        onChange={(e) => setContactSubject(e.target.value)}
                        placeholder="Account question, bug report, or merchant inquiry"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="support-message" className="block text-xs text-slate-300 mb-1">
                        {lang === 'ur' ? 'تفصیلی پیغام' : 'Message'}
                      </label>
                      <textarea
                        id="support-message"
                        rows={4}
                        required
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    {contactStatus.error && (
                      <p className="text-xs text-red-400">{contactStatus.error}</p>
                    )}
                    {contactStatus.success && (
                      <p className="text-xs text-emerald-400">{contactStatus.success}</p>
                    )}
                    <button
                      type="submit"
                      disabled={contactStatus.submitting}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      {contactStatus.submitting
                        ? 'Saving Ticket...'
                        : lang === 'ur'
                        ? 'سپورٹ ٹکٹ جمع کروائیں'
                        : 'Submit Support Ticket'}
                    </button>
                  </form>
                </div>
              </div>
            </section>

            {/* 12. RESPONSIBLE GAMING & COMPLIANCE NOTICE */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="p-6 rounded-xl bg-[#111827] border border-slate-800">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                    <h3 className="text-sm font-bold text-white">
                      {lang === 'ur'
                        ? 'ذمہ دارانہ گیمنگ اور قانونی وضاحت'
                        : 'Responsible Gaming & Payment Compliance Notice'}
                    </h3>
                    <p>
                      GameZone PK is a skill-based recreational gaming website for Pakistani users. We do not offer gambling, betting, paid chance-based games, or guaranteed income returns. Experience points (XP), badges, and leaderboard rankings are strictly virtual entertainment features.
                    </p>
                    <p className="text-slate-400">
                      Security Reminder: Never share or enter your Easypaisa PIN, banking password, or OTP on any website. Official merchant gateway features operate strictly via server-verified callbacks upon merchant approval.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* AUTHENTICATION MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-[#111827] border border-slate-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                {authMode === 'login'
                  ? 'Sign In to GameZone PK'
                  : authMode === 'register'
                  ? 'Create Player Account'
                  : 'Reset Account Password'}
              </h2>
              <button
                onClick={() => setAuthModalOpen(false)}
                className="text-slate-400 hover:text-white"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors mb-4"
            >
              Continue with Google Sign-In (Instant Verified Access)
            </button>

            <div className="relative my-4 text-center">
              <span className="px-2 bg-[#111827] text-xs text-slate-500">or use email credentials</span>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>
              {authMode !== 'reset' && (
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                  />
                </div>
              )}

              {authError && <p className="text-xs text-red-400">{authError}</p>}
              {authNotice && <p className="text-xs text-emerald-400">{authNotice}</p>}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {authMode === 'login'
                  ? 'Sign In with Email'
                  : authMode === 'register'
                  ? 'Register & Send Verification'
                  : 'Send Password Reset Email'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              {authMode !== 'login' && (
                <button onClick={() => setAuthMode('login')} className="hover:text-white">
                  Sign In
                </button>
              )}
              {authMode !== 'register' && (
                <button onClick={() => setAuthMode('register')} className="hover:text-white">
                  Create Account
                </button>
              )}
              {authMode !== 'reset' && (
                <button onClick={() => setAuthMode('reset')} className="hover:text-white">
                  Forgot Password?
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CLEAN FOOTER */}
      <footer className="bg-[#060911] border-t border-slate-800/80 py-10 px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-bold text-white font-display">GameZone PK</p>
            <p className="mt-1">
              Pakistan’s Free-to-Play Skill Gaming Platform · All rights reserved © {new Date().getFullYear()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              onClick={() => {
                setLegalTab('privacy');
                navigateTo('legal', '/legal');
              }}
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => {
                setLegalTab('terms');
                navigateTo('legal', '/legal');
              }}
              className="hover:text-white transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => {
                setLegalTab('responsible');
                navigateTo('legal', '/legal');
              }}
              className="hover:text-white transition-colors"
            >
              Responsible Play
            </button>
            <button
              onClick={() => {
                setLegalTab('refund');
                navigateTo('legal', '/legal');
              }}
              className="hover:text-white transition-colors"
            >
              Easypaisa Payment Policy
            </button>
            <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
              Sitemap
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
