import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import {
  loadCommunitySubjects,
  loadMyConfigsFor,
  loadUsers,
  removeCommunitySubject,
  setCommunitySubjectPublic,
  type CommunitySubject,
} from '../lib/storage';
import {
  serverAdminCommunityList,
  serverAdminRemove,
  serverAdminSetPublic,
  serverAdminUsers,
  type AdminUserSummary,
} from '../lib/serverApi';

export default function AdminPage() {
  const { username, isAdmin, token } = useAuthStore();
  const [community, setCommunity] = useState<CommunitySubject[]>(() => loadCommunitySubjects());
  const [serverUsers, setServerUsers] = useState<AdminUserSummary[] | null>(null);
  const [usingServer, setUsingServer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const localUsers = useMemo(() => loadUsers(), [tick]);
  const localUserSubjects = useMemo(() => {
    const map = new Map<string, ReturnType<typeof loadMyConfigsFor>>();
    for (const u of localUsers) map.set(u.username, loadMyConfigsFor(u.username));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localUsers, tick]);

  async function refresh() {
    if (token) {
      const [usersRes, communityRes] = await Promise.all([serverAdminUsers(token), serverAdminCommunityList(token)]);
      if (usersRes.ok && communityRes.ok) {
        setServerUsers(usersRes.data.users);
        setCommunity(communityRes.data.items);
        setUsingServer(true);
        setNotice(null);
        return;
      }
      if (usersRes.ok === false && usersRes.reason !== 'not-configured') {
        setNotice(`Server: ${usersRes.error}`);
      }
    }
    setUsingServer(false);
    setServerUsers(null);
    setCommunity(loadCommunitySubjects());
    setTick((t) => t + 1);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!username || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  async function togglePublic(entry: CommunitySubject) {
    if (usingServer && token) {
      await serverAdminSetPublic(token, entry.id, !entry.public);
    } else {
      setCommunitySubjectPublic(entry.id, !entry.public);
    }
    void refresh();
  }

  async function remove(entry: CommunitySubject) {
    if (!window.confirm(`Opravdu trvale odebrat sdílený předmět „${entry.name}“ od uživatele ${entry.author}?`)) return;
    if (usingServer && token) {
      await serverAdminRemove(token, entry.id);
    } else {
      removeCommunitySubject(entry.id);
    }
    void refresh();
  }

  // Normalize either data source into the same shape for rendering.
  const userRows = usingServer && serverUsers
    ? serverUsers.map((u) => ({
        username: u.username,
        isAdmin: u.isAdmin,
        summary:
          u.subjects.length === 0
            ? 'Nemá žádné vlastní vytvořené předměty.'
            : `Vlastní předměty: ${u.subjects.map((c) => `${c.name} (${c.questionCount})`).join(', ')}`,
      }))
    : localUsers.map((u) => {
        const mine = localUserSubjects.get(u.username) ?? [];
        return {
          username: u.username,
          isAdmin: !!u.isAdmin,
          summary:
            mine.length === 0
              ? 'Nemá žádné vlastní vytvořené předměty.'
              : `Vlastní předměty: ${mine.map((c) => `${c.name} (${c.questions.length})`).join(', ')}`,
        };
      });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Administrace</h1>
      <p className="mb-2 text-gray-500 dark:text-gray-400">
        Přehled všech uživatelů, jejich vlastních otázek a žádostí o sdílení. Zde můžete sdílené předměty
        zveřejnit (uvidí je pak všichni v komunitní nabídce) nebo je odebrat.
      </p>
      <p className="mb-6 text-xs text-gray-400 dark:text-gray-500">
        {usingServer
          ? '🌐 Data se načítají ze serveru — vidíte uživatele a sdílení napříč všemi zařízeními.'
          : 'ℹ️ Server pro sdílení mezi zařízeními zatím není nakonfigurovaný (nebo není dostupný) — zobrazují se pouze data z tohoto prohlížeče.'}
      </p>
      {notice && <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">{notice}</p>}

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Uživatelé ({userRows.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {userRows.map((u) => (
            <li
              key={u.username}
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <p className="font-medium text-gray-900 dark:text-gray-100">
                👤 {u.username}
                {u.isAdmin && (
                  <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                    admin
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{u.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Žádosti o sdílení ({community.length})
        </h2>
        {community.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Zatím nikdo nic k veřejnému sdílení neodeslal.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {community.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    ✍️ {entry.name}{' '}
                    <span className="font-normal text-gray-400">
                      · od {entry.author} · {entry.config.questions.length} otázek
                    </span>
                  </p>
                  <p className={`text-xs ${entry.public ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {entry.public ? '🌍 Veřejné' : '⏳ Čeká na schválení'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void togglePublic(entry)}
                    className={`min-h-[36px] rounded-lg border px-3 text-sm font-medium transition-colors ${
                      entry.public
                        ? 'border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-600 dark:border-gray-600 dark:text-gray-300'
                        : 'border-violet-400 text-violet-600 hover:bg-violet-50 dark:border-violet-600 dark:text-violet-300 dark:hover:bg-violet-900/30'
                    }`}
                  >
                    {entry.public ? 'Zrušit zveřejnění' : '🌍 Zveřejnit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(entry)}
                    className="min-h-[36px] rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:border-red-400 hover:text-red-600 dark:border-gray-600 dark:text-gray-300"
                  >
                    🗑 Odebrat
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
