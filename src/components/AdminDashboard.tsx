import React, { useState, useEffect } from 'react';
import { Download, ShieldAlert, CheckCircle2, EyeOff, Eye, Plus, Save } from 'lucide-react';

interface AdminDashboardProps {
  idToken: string | null;
  onRefreshPublic: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ idToken, onRefreshPublic }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'users' | 'games' | 'tickets' | 'leaderboard' | 'content' | 'payments' | 'audit'
  >('games');
  const [data, setData] = useState<{
    users: any[];
    games: any[];
    sessions: any[];
    tickets: any[];
    announcements: any[];
    faqs: any[];
    payments: any[];
    auditLogs: any[];
    settings: any[];
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annTitleUr, setAnnTitleUr] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annContentUr, setAnnContentUr] = useState('');

  // New FAQ form
  const [faqQ, setFaqQ] = useState('');
  const [faqQUr, setFaqQUr] = useState('');
  const [faqA, setFaqA] = useState('');
  const [faqAUr, setFaqAUr] = useState('');

  // Editing game state
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [editGameForm, setEditGameForm] = useState<{
    title: string;
    category: string;
    description: string;
    thumbnailUrl: string;
  }>({ title: '', category: '', description: '', thumbnailUrl: '' });

  const fetchAdminData = async () => {
    if (!idToken) {
      setError('Unauthorized admin access: Please sign in with an authorized administrator account.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Unauthorized admin access.');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [idToken]);

  const handleToggleGameStatus = async (game: any, field: 'isActive' | 'isFeatured') => {
    if (!idToken) return;
    try {
      const res = await fetch(`/api/admin/games/${game.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ [field]: !game[field] }),
      });
      if (res.ok) {
        setStatusMessage(`Updated ${game.title}`);
        fetchAdminData();
        onRefreshPublic();
      }
    } catch {
      setStatusMessage('Error updating game.');
    }
  };

  const handleSaveGameDetails = async (gameId: number) => {
    if (!idToken) return;
    try {
      const res = await fetch(`/api/admin/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(editGameForm),
      });
      if (res.ok) {
        setEditingGameId(null);
        setStatusMessage('Game details updated.');
        fetchAdminData();
        onRefreshPublic();
      }
    } catch {
      setStatusMessage('Failed to save game changes.');
    }
  };

  const handleUpdateTicket = async (ticketId: number, status: string, adminNote: string) => {
    if (!idToken) return;
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ status, adminNote }),
      });
      if (res.ok) {
        setStatusMessage(`Ticket #${ticketId} updated to ${status}.`);
        fetchAdminData();
      }
    } catch {
      setStatusMessage('Failed to update ticket.');
    }
  };

  const handleModerateSession = async (sessionId: number, currentModerated: boolean) => {
    if (!idToken) return;
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ isModerated: !currentModerated }),
      });
      if (res.ok) {
        setStatusMessage(`Leaderboard session #${sessionId} updated.`);
        fetchAdminData();
        onRefreshPublic();
      }
    } catch {
      setStatusMessage('Failed to moderate session.');
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken || !annTitle || !annContent) return;
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: annTitle,
          titleUr: annTitleUr || annTitle,
          content: annContent,
          contentUr: annContentUr || annContent,
        }),
      });
      if (res.ok) {
        setAnnTitle('');
        setAnnTitleUr('');
        setAnnContent('');
        setAnnContentUr('');
        setStatusMessage('Announcement published.');
        fetchAdminData();
        onRefreshPublic();
      }
    } catch {
      setStatusMessage('Failed to publish announcement.');
    }
  };

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idToken || !faqQ || !faqA) return;
    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          question: faqQ,
          questionUr: faqQUr || faqQ,
          answer: faqA,
          answerUr: faqAUr || faqA,
          sortOrder: (data?.faqs.length || 0) + 1,
        }),
      });
      if (res.ok) {
        setFaqQ('');
        setFaqQUr('');
        setFaqA('');
        setFaqAUr('');
        setStatusMessage('FAQ item created.');
        fetchAdminData();
        onRefreshPublic();
      }
    } catch {
      setStatusMessage('Failed to create FAQ.');
    }
  };

  const exportCsvReport = (type: 'users' | 'sessions' | 'payments') => {
    if (!data) return;
    let rows: string[][] = [];
    if (type === 'users') {
      rows = [
        ['ID', 'UID', 'Username', 'Email', 'Role', 'XP', 'Status', 'Created At'],
        ...data.users.map((u) => [
          String(u.id),
          u.uid,
          u.username,
          u.email,
          u.role,
          String(u.xp),
          u.accountStatus,
          u.createdAt,
        ]),
      ];
    } else if (type === 'sessions') {
      rows = [
        ['Session ID', 'Username', 'Game', 'Score', 'Duration (s)', 'Moderated', 'Completed At'],
        ...data.sessions.map((s) => [
          String(s.id),
          s.username,
          s.gameSlug,
          String(s.score),
          String(s.durationSeconds),
          String(s.isModerated),
          s.completedAt,
        ]),
      ];
    } else {
      rows = [
        ['ID', 'Order Ref', 'User UID', 'Amount PKR', 'Status', 'Provider Ref', 'Created At'],
        ...data.payments.map((p) => [
          String(p.id),
          p.merchantOrderRef,
          p.userId,
          String(p.amountPkr),
          p.status,
          p.providerReference || '',
          p.createdAt,
        ]),
      ];
    }

    const csvContent = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gamezone_pk_${type}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-6">
        <div className="p-8 rounded-xl bg-[#111827] border border-slate-800 text-sm text-slate-400">
          Verifying administrator privileges and loading database records...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6">
        <div className="p-8 rounded-xl bg-[#111827] border border-red-900/60">
          <div className="flex items-center gap-3 text-red-400 mb-3">
            <ShieldAlert className="w-6 h-6" />
            <h2 className="text-lg font-bold">Restricted Administrator Area (/admin)</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {error || 'Access denied. Server-side role verification requires an authorized admin account.'}
          </p>
          <p className="text-xs text-slate-400">
            Security policy: Administrative privileges are verified on the server against protected PostgreSQL role records and cannot be bypassed via client parameters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800">
        <div>
          <p className="text-xs text-emerald-400 font-medium">Server-Verified Administrator Console · /admin</p>
          <h1 className="text-2xl font-bold text-white">GameZone PK Operations & Governance</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportCsvReport('users')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Export Users CSV
          </button>
          <button
            onClick={() => exportCsvReport('sessions')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Export Leaderboard CSV
          </button>
          <button
            onClick={() => exportCsvReport('payments')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Export Reconciliations CSV
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 font-mono tabular-nums">
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800">
          <p className="text-xs text-slate-400 font-sans">Registered Players</p>
          <p className="text-2xl font-bold text-white mt-1">{data.users.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800">
          <p className="text-xs text-slate-400 font-sans">Active Free Games</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {data.games.filter((g) => g.isActive).length} / {data.games.length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800">
          <p className="text-xs text-slate-400 font-sans">Open Support Tickets</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {data.tickets.filter((t) => t.status !== 'resolved').length}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[#111827] border border-slate-800">
          <p className="text-xs text-slate-400 font-sans">Recorded Sessions</p>
          <p className="text-2xl font-bold text-white mt-1">{data.sessions.length}</p>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#111827] border border-slate-800 rounded-lg mb-6">
        {(
          [
            { id: 'games', label: 'Games Catalog' },
            { id: 'users', label: 'Registered Users' },
            { id: 'tickets', label: 'Support Tickets' },
            { id: 'leaderboard', label: 'Leaderboard Moderation' },
            { id: 'content', label: 'Announcements & FAQ' },
            { id: 'payments', label: 'Easypaisa Ledger' },
            { id: 'audit', label: 'Admin Audit Logs' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* GAMES MANAGEMENT TAB */}
      {activeTab === 'games' && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-3 px-4">Game Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Featured</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.games.map((g) => (
                  <React.Fragment key={g.id}>
                    <tr className="hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-medium text-white">
                        {g.title} <span className="text-xs text-slate-400">· {g.titleUr}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-xs">{g.category}</td>
                      <td className="py-3 px-4 text-xs">
                        <button
                          onClick={() => handleToggleGameStatus(g, 'isActive')}
                          className={`px-2.5 py-1 rounded text-xs font-medium ${
                            g.isActive
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {g.isActive ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <button
                          onClick={() => handleToggleGameStatus(g, 'isFeatured')}
                          className={`px-2.5 py-1 rounded text-xs font-medium ${
                            g.isFeatured
                              ? 'bg-amber-950 text-amber-300 border border-amber-700/50'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {g.isFeatured ? 'Featured' : 'Standard'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingGameId(editingGameId === g.id ? null : g.id);
                            setEditGameForm({
                              title: g.title,
                              category: g.category,
                              description: g.description,
                              thumbnailUrl: g.thumbnailUrl || '',
                            });
                          }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                          {editingGameId === g.id ? 'Close Editor' : 'Edit Metadata & Thumbnail'}
                        </button>
                      </td>
                    </tr>
                    {editingGameId === g.id && (
                      <tr className="bg-slate-900/90">
                        <td colSpan={5} className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Title</label>
                              <input
                                type="text"
                                value={editGameForm.title}
                                onChange={(e) => setEditGameForm({ ...editGameForm, title: e.target.value })}
                                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Category</label>
                              <input
                                type="text"
                                value={editGameForm.category}
                                onChange={(e) => setEditGameForm({ ...editGameForm, category: e.target.value })}
                                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1">Thumbnail Image URL</label>
                              <input
                                type="text"
                                value={editGameForm.thumbnailUrl}
                                onChange={(e) => setEditGameForm({ ...editGameForm, thumbnailUrl: e.target.value })}
                                className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                              />
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="block text-xs text-slate-400 mb-1">Description</label>
                            <textarea
                              rows={2}
                              value={editGameForm.description}
                              onChange={(e) => setEditGameForm({ ...editGameForm, description: e.target.value })}
                              className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                            />
                          </div>
                          <button
                            onClick={() => handleSaveGameDetails(g.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                          >
                            <Save className="w-3.5 h-3.5" /> Save Game Updates
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REGISTERED USERS TAB */}
      {activeTab === 'users' && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-right">Virtual XP</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-4 font-medium text-white">{u.username}</td>
                    <td className="py-3 px-4 text-slate-300 text-xs">{u.email}</td>
                    <td className="py-3 px-4 text-xs text-emerald-400 font-mono">{u.role}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-400">{u.xp}</td>
                    <td className="py-3 px-4 text-xs text-slate-300">{u.accountStatus}</td>
                    <td className="py-3 px-4 text-right text-xs text-slate-400 font-mono tabular-nums">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPPORT TICKETS TAB */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {data.tickets.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#111827] border border-slate-800 text-center text-sm text-slate-400">
              No support tickets submitted yet.
            </div>
          ) : (
            data.tickets.map((t) => (
              <div key={t.id} className="p-5 rounded-xl bg-[#111827] border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-mono text-emerald-400">Ticket #{t.id}</span>
                    <span className="mx-2 text-slate-600">·</span>
                    <strong className="text-sm text-white">{t.subject}</strong>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Status: <strong className="text-amber-400 uppercase">{t.status}</strong>
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-2">
                  From: {t.name} ({t.email}) · {new Date(t.createdAt).toLocaleString()}
                </p>
                <p className="text-sm text-slate-200 bg-slate-900 p-3 rounded-lg border border-slate-800 mb-3">
                  {t.message}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleUpdateTicket(t.id, 'in_progress', 'Investigating issue with support team.')}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                  >
                    Mark In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateTicket(t.id, 'resolved', 'Issue resolved and verified by Admin.')}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-medium"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* LEADERBOARD MODERATION TAB */}
      {activeTab === 'leaderboard' && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4 text-right">Score</th>
                  <th className="py-3 px-4 text-right">Duration</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4 text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/50">
                    <td className="py-3 px-4 font-medium text-white">{s.username}</td>
                    <td className="py-3 px-4 text-xs text-slate-300">{s.gameSlug}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 font-bold">
                      {s.score}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-400">
                      {s.durationSeconds}s
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {s.isModerated ? (
                        <span className="text-red-400">Hidden (Flagged)</span>
                      ) : (
                        <span className="text-emerald-400">Public Verified</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleModerateSession(s.id, s.isModerated)}
                        className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"
                      >
                        {s.isModerated ? (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Restore
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Hide Score
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENTS & FAQ CONTENT TAB */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handlePublishAnnouncement}
            className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4"
          >
            <h3 className="text-base font-bold text-white">Publish Platform Announcement</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Headline (English)</label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Headline (Urdu - Optional)</label>
              <input
                type="text"
                value={annTitleUr}
                onChange={(e) => setAnnTitleUr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Message Body (English)</label>
              <textarea
                rows={3}
                required
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" /> Publish Announcement
            </button>
          </form>

          <form
            onSubmit={handleCreateFaq}
            className="p-6 rounded-xl bg-[#111827] border border-slate-800 space-y-4"
          >
            <h3 className="text-base font-bold text-white">Add Frequently Asked Question</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Question (English)</label>
              <input
                type="text"
                required
                value={faqQ}
                onChange={(e) => setFaqQ(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Question (Urdu - Optional)</label>
              <input
                type="text"
                value={faqQUr}
                onChange={(e) => setFaqQUr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Answer (English)</label>
              <textarea
                rows={3}
                required
                value={faqA}
                onChange={(e) => setFaqA(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-4 h-4" /> Add FAQ to Home Page
            </button>
          </form>
        </div>
      )}

      {/* EASYPAISA TRANSACTION LEDGER TAB */}
      {activeTab === 'payments' && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Authorized Payment & Sandbox Verification Records (PKR) · Zero PIN/OTP Storage Policy
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-3 px-4">Order Reference</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4 text-right">Amount (PKR)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Provider Ref</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                      No transaction records logged yet.
                    </td>
                  </tr>
                ) : (
                  data.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-mono text-xs text-white">{p.merchantOrderRef}</td>
                      <td className="py-3 px-4 text-xs text-slate-300">{p.purpose}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-400">
                        PKR {p.amountPkr}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono uppercase">
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
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        {p.providerReference || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-400">
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'audit' && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {data.auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                      No administrative actions recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/50">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-xs text-white">{log.adminEmail}</td>
                      <td className="py-3 px-4 font-mono text-xs text-emerald-400">{log.action}</td>
                      <td className="py-3 px-4 text-xs text-slate-300">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
