import React, { useState, useEffect } from 'react';
import { Trophy, Award, Bell, Settings, CreditCard, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PlayerDashboardProps {
  idToken: string | null;
  lang: 'en' | 'ur';
  allAchievements: any[];
  easypaisaStatus: {
    merchantCredentialsConfigured: boolean;
    sandboxSupported: boolean;
    mode: string;
  };
  onSignOut: () => void;
}

export const PlayerDashboard: React.FC<PlayerDashboardProps> = ({
  idToken,
  lang,
  allAchievements,
  easypaisaStatus,
  onSignOut,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    profile: any;
    sessions: any[];
    unlockedAchievements: any[];
    tickets: any[];
    notifications: any[];
    payments: any[];
    leaderboardPosition: number | null;
    totalRegisteredPlayers: number;
  } | null>(null);

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Easypaisa Gateway Sandbox / Merchant State
  const [amountPkr, setAmountPkr] = useState<number>(250);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);
  const [pendingOrder, setPendingOrder] = useState<{
    merchantOrderRef: string;
    amountPkr: number;
    signature: string;
  } | null>(null);

  const fetchDashboard = async () => {
    if (!idToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load profile.');
      setData(json);
      if (json.profile) {
        setUsername(json.profile.username || '');
        setAvatarUrl(json.profile.avatarUrl || '');
        setPreferredLanguage(json.profile.preferredLanguage || 'en');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [idToken]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken) return;
    setProfileMessage(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ username, avatarUrl, preferredLanguage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed.');
      setProfileMessage('Account settings updated.');
      fetchDashboard();
    } catch (err: any) {
      setProfileMessage(err.message);
    }
  };

  const handleRequestDeletion = async () => {
    if (!idToken) return;
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          username,
          avatarUrl,
          preferredLanguage,
          accountStatus: 'deletion_requested',
        }),
      });
      if (res.ok) {
        setProfileMessage('Account deletion request logged for compliance review.');
        fetchDashboard();
      }
    } catch {
      setProfileMessage('Could not submit deletion request.');
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    if (!idToken) return;
    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    fetchDashboard();
  };

  const handleInitializeEasypaisa = async (isSandboxTest: boolean) => {
    if (!idToken) return;
    setPaymentFeedback(null);
    try {
      const res = await fetch('/api/easypaisa/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amountPkr,
          purpose: 'Supporter Cosmetic Profile Badge Pass',
          isSandboxTest,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPaymentFeedback({ type: 'error', text: json.error || 'Payment initialization failed.' });
        return;
      }
      setPendingOrder({
        merchantOrderRef: json.order.merchantOrderRef,
        amountPkr: json.order.amountPkr,
        signature: json.signature,
      });
      setPaymentFeedback({
        type: 'info',
        text: `Order ${json.order.merchantOrderRef} initialized in PENDING state. Awaiting cryptographic callback verification.`,
      });
      fetchDashboard();
    } catch (err: any) {
      setPaymentFeedback({ type: 'error', text: err.message });
    }
  };

  const handleTriggerSandboxCallback = async (outcome: 'verified' | 'failed' | 'cancelled', tamperSignature = false) => {
    if (!idToken || !pendingOrder) return;
    try {
      const res = await fetch('/api/easypaisa/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          merchantOrderRef: pendingOrder.merchantOrderRef,
          providerReference: `EP-SANDBOX-${Date.now()}`,
          amountPkr: pendingOrder.amountPkr,
          signature: tamperSignature ? 'INVALID_TAMPERED_HMAC' : pendingOrder.signature,
          outcome,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPaymentFeedback({ type: 'error', text: json.error });
        return;
      }
      if (json.duplicate) {
        setPaymentFeedback({
          type: 'info',
          text: `Idempotency guard: Order ${pendingOrder.merchantOrderRef} was already verified. Duplicate callback ignored.`,
        });
      } else {
        setPaymentFeedback({
          type: outcome === 'verified' ? 'success' : 'error',
          text: `Callback processed: Order ${pendingOrder.merchantOrderRef} is now ${outcome.toUpperCase()}.`,
        });
      }
      fetchDashboard();
    } catch (err: any) {
      setPaymentFeedback({ type: 'error', text: err.message });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="p-8 rounded-xl bg-[#111827] border border-slate-800 text-sm text-slate-400">
          Loading player telemetry and profile records...
        </div>
      </div>
    );
  }

  if (error || !data || !data.profile) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="p-6 rounded-xl bg-[#111827] border border-red-900/50 text-sm text-red-300">
          {error || 'Unable to load player profile.'}
        </div>
      </div>
    );
  }

  const unlockedSet = new Set(data.unlockedAchievements.map((u: any) => u.achievementId));
  const bestScore = data.sessions.reduce((max: number, s: any) => (s.score > max ? s.score : max), 0);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Profile Header */}
      <div className="p-6 rounded-xl bg-[#111827] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {data.profile.avatarUrl ? (
            <img
              src={data.profile.avatarUrl}
              alt={data.profile.username}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full object-cover border border-emerald-500/50"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-xl font-bold text-emerald-300">
              {data.profile.username.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">{data.profile.username}</h1>
            <p className="text-xs text-slate-400">
              {data.profile.email} · Role: <span className="text-emerald-400">{data.profile.role}</span> · Status:{' '}
              <span>{data.profile.accountStatus}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="px-4 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          {lang === 'ur' ? 'سائن آؤٹ' : 'Sign Out'}
        </button>
      </div>

      {/* Virtual XP & Non-Cash Disclosure Banner */}
      <div className="px-4 py-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-center gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          {lang === 'ur'
            ? 'نوٹ: ایکس پی پوائنٹس، بیجز اور لیڈر بورڈ رینکنگ صرف ورچوئل گیم فیچرز ہیں اور نقد رقم یا آمدنی نہیں ہیں۔'
            : 'Notice: Experience Points (XP), badges, and leaderboard rankings are strictly virtual game features and are never withdrawable cash or guaranteed earnings.'}
        </span>
      </div>

      {/* 4-Column Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono tabular-nums">
        <div className="p-5 rounded-xl bg-[#111827] border border-slate-800">
          <p className="text-xs text-slate-400 font-sans">Games Played</p>
          <p className="text-2xl font-bold text-white mt-1">{data.sessions.length}</p>
        </div>
        <div className="p-5 rounded-xl bg-[#111827] border border-slate-800">
          <p className="text-xs text-slate-400 font-sans">Personal Best Score</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{bestScore}</p>
        </div>
        <div className="p-5 rounded-xl bg-[#111827] border border-slate-800">
          <p className="text-xs text-slate-400 font-sans">Virtual Experience (XP)</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{data.profile.xp} XP</p>
        </div>
        <div className="p-5 rounded-xl bg-[#111827] border border-slate-800">
          <p className="text-xs text-slate-400 font-sans">Leaderboard Position</p>
          <p className="text-2xl font-bold text-white mt-1">
            {data.leaderboardPosition ? `#${data.leaderboardPosition}` : '—'}{' '}
            <span className="text-xs text-slate-500 font-normal">of {data.totalRegisteredPlayers}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Badges, Activity & Easypaisa Merchant Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Earned Badges */}
          <div className="p-6 rounded-xl bg-[#111827] border border-slate-800">
            <h2 className="text-base font-bold text-white mb-4">Player Achievements & Virtual Badges</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allAchievements.map((ach) => {
                const isUnlocked = unlockedSet.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-lg border ${
                      isUnlocked
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : 'bg-slate-900/50 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-white">
                        {lang === 'ur' ? ach.titleUr : ach.title}
                      </span>
                      <span className="text-xs font-mono text-amber-400">+{ach.xpReward} XP</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {lang === 'ur' ? ach.descriptionUr : ach.description}
                    </p>
                    <p className="text-xs font-mono mt-2 text-emerald-400">
                      {isUnlocked ? 'Unlocked' : 'Locked'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Game Activity */}
          <div className="p-6 rounded-xl bg-[#111827] border border-slate-800">
            <h2 className="text-base font-bold text-white mb-4">Recent Verified Game Sessions</h2>
            {data.sessions.length === 0 ? (
              <p className="text-xs text-slate-400">
                No completed games recorded yet. Play any free game in the arena to log your first score.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400">
                      <th className="py-2.5 pr-4">Game</th>
                      <th className="py-2.5 px-4 text-right">Score</th>
                      <th className="py-2.5 px-4 text-right">Duration</th>
                      <th className="py-2.5 pl-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums text-xs">
                    {data.sessions.slice(0, 8).map((s: any) => (
                      <tr key={s.id}>
                        <td className="py-2.5 pr-4 font-sans text-white font-medium">{s.gameSlug}</td>
                        <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">{s.score}</td>
                        <td className="py-2.5 px-4 text-right text-slate-300">{s.durationSeconds}s</td>
                        <td className="py-2.5 pl-4 text-right text-slate-400">
                          {new Date(s.completedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Easypaisa Official Merchant Gateway & Transaction History */}
          <div className="p-6 rounded-xl bg-[#111827] border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Easypaisa Merchant Gateway (PKR)</span>
              </h2>
              <span className="text-xs font-mono text-amber-400">
                {easypaisaStatus.merchantCredentialsConfigured
                  ? 'Merchant Gateway Active'
                  : 'Payments Not Yet Available (Pending Approval)'}
              </span>
            </div>

            {!easypaisaStatus.merchantCredentialsConfigured && (
              <div className="p-4 rounded-lg bg-slate-900 border border-amber-500/30 text-xs text-slate-300 space-y-2 mb-5">
                <p className="font-semibold text-amber-300">
                  Payments not yet available — Official Easypaisa Merchant Approval Required
                </p>
                <p className="leading-relaxed">
                  Live PKR transactions are disabled until official Easypaisa merchant credentials (
                  <code className="text-emerald-300">EASYPAISA_STORE_ID</code> and{' '}
                  <code className="text-emerald-300">EASYPAISA_HASH_KEY</code>) are approved and configured on the server. GameZone PK never asks for your Easypaisa PIN or OTP, and never simulates fake live payments.
                </p>
              </div>
            )}

            {/* Developer Sandbox Test Harness for Verifying Callback Security */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 mb-5">
              <p className="text-xs font-semibold text-white mb-2">
                Merchant Integration & Callback Security Verification (Development Sandbox)
              </p>
              <p className="text-xs text-slate-400 mb-3">
                Test unique order reference generation, server-side HMAC signature verification, and duplicate-callback idempotency protection.
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Amount (PKR):</label>
                  <input
                    type="number"
                    min={50}
                    max={50000}
                    value={amountPkr}
                    onChange={(e) => setAmountPkr(Number(e.target.value))}
                    className="w-28 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                  />
                </div>
                <button
                  onClick={() => handleInitializeEasypaisa(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 whitespace-nowrap shrink-0"
                >
                  Attempt Live Init
                </button>
                <button
                  onClick={() => handleInitializeEasypaisa(true)}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-medium whitespace-nowrap shrink-0"
                >
                  Initialize Sandbox Order
                </button>
              </div>

              {pendingOrder && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <p className="text-xs font-mono text-slate-300">
                    Active Sandbox Order: <strong className="text-amber-400">{pendingOrder.merchantOrderRef}</strong> · PKR{' '}
                    {pendingOrder.amountPkr}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleTriggerSandboxCallback('verified', false)}
                      className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-600/50 text-emerald-300 text-xs"
                    >
                      Verify Signed Callback
                    </button>
                    <button
                      onClick={() => handleTriggerSandboxCallback('failed', false)}
                      className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                    >
                      Simulate Failed Callback
                    </button>
                    <button
                      onClick={() => handleTriggerSandboxCallback('verified', true)}
                      className="px-2.5 py-1 rounded bg-red-950/60 border border-red-700/50 text-red-300 text-xs"
                    >
                      Test Invalid Signature Rejection
                    </button>
                  </div>
                </div>
              )}

              {paymentFeedback && (
                <p
                  className={`mt-3 text-xs ${
                    paymentFeedback.type === 'error'
                      ? 'text-red-400'
                      : paymentFeedback.type === 'success'
                      ? 'text-emerald-400'
                      : 'text-amber-300'
                  }`}
                >
                  {paymentFeedback.text}
                </p>
              )}
            </div>

            {/* Transaction History Table */}
            <h3 className="text-xs font-semibold text-slate-300 mb-2">Transaction History</h3>
            {data.payments.length === 0 ? (
              <p className="text-xs text-slate-500">No transaction records on file.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-sans">
                      <th className="py-2 pr-3">Reference</th>
                      <th className="py-2 px-3">Purpose</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                      <th className="py-2 pl-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.payments.map((p: any) => (
                      <tr key={p.id}>
                        <td className="py-2 pr-3 text-white">{p.merchantOrderRef}</td>
                        <td className="py-2 px-3 font-sans text-slate-300">{p.purpose}</td>
                        <td className="py-2 px-3 text-right text-amber-400">PKR {p.amountPkr}</td>
                        <td className="py-2 pl-3 text-right uppercase">
                          <span
                            className={
                              p.status === 'verified'
                                ? 'text-emerald-400'
                                : p.status === 'pending'
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Account Settings, Notifications & Support Requests */}
        <div className="space-y-6">
          {/* Account Settings */}
          <form
            onSubmit={handleSaveProfile}
            className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4"
          >
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Account Settings</span>
            </h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Profile Picture URL (Optional)</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Preferred Language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              >
                <option value="en">English</option>
                <option value="ur">اردو (Urdu)</option>
              </select>
            </div>
            {profileMessage && <p className="text-xs text-emerald-400">{profileMessage}</p>}
            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Save Profile
              </button>
              <button
                type="button"
                onClick={handleRequestDeletion}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Request Account Deletion
              </button>
            </div>
          </form>

          {/* Notifications */}
          <div className="p-6 rounded-xl bg-[#111827] border border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Notifications</span>
            </h2>
            <div className="space-y-3">
              {data.notifications.length === 0 ? (
                <p className="text-xs text-slate-400">No notifications.</p>
              ) : (
                data.notifications.slice(0, 5).map((n: any) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border text-xs ${
                      n.readAt
                        ? 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                        : 'bg-slate-900 border-emerald-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-white">{n.title}</strong>
                      {!n.readAt && (
                        <button
                          onClick={() => handleMarkNotificationRead(n.id)}
                          className="text-[11px] text-emerald-400 hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    <p>{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Support Ticket Status */}
          <div className="p-6 rounded-xl bg-[#111827] border border-slate-800">
            <h2 className="text-base font-bold text-white mb-4">My Support Requests</h2>
            {data.tickets.length === 0 ? (
              <p className="text-xs text-slate-400">You have not submitted any support tickets.</p>
            ) : (
              <div className="space-y-3">
                {data.tickets.map((t: any) => (
                  <div key={t.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-white">{t.subject}</strong>
                      <span className="font-mono uppercase text-amber-400">{t.status}</span>
                    </div>
                    <p className="text-slate-400 line-clamp-2">{t.message}</p>
                    {t.adminNote && (
                      <p className="mt-2 pt-2 border-t border-slate-800 text-emerald-300">
                        Admin Response: {t.adminNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
