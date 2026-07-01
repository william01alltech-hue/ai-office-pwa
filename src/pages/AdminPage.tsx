import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import type { UserProfile } from '../services/userService';
import toast from 'react-hot-toast';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:      { label: '👑 管理員', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  enterprise: { label: '🏢 企業版', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  user:       { label: '🪙 一般用戶', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
};

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
        list.sort((a, b) => {
          const order = { admin: 0, enterprise: 1, user: 2 };
          return (order[a.role] ?? 3) - (order[b.role] ?? 3);
        });
        setUsers(list);
      } catch (e) {
        console.error(e);
        toast.error('無法讀取用戶資料');
      } finally {
        setFetching(false);
      }
    };
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const handleRoleChange = async (uid: string, newRole: 'enterprise' | 'user') => {
    setUpdatingUid(uid);
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole,
        points: newRole === 'enterprise' ? 99999 : 100,
      });
      setUsers(prev => prev.map(u =>
        u.uid === uid ? { ...u, role: newRole, points: newRole === 'enterprise' ? 99999 : 100 } : u
      ));
      toast.success(`已更新為${newRole === 'enterprise' ? '企業版' : '一般用戶'}`);
    } catch (e) {
      toast.error('更新失敗');
    } finally {
      setUpdatingUid(null);
    }
  };

  const filtered = users.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    enterprise: users.filter(u => u.role === 'enterprise').length,
    user: users.filter(u => u.role === 'user').length,
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              👑 管理後台
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">SyncCore AI 用戶管理</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '總用戶數', value: stats.total, icon: '👥', color: 'from-slate-500 to-slate-700' },
            { label: '管理員', value: stats.admin, icon: '👑', color: 'from-amber-400 to-orange-500' },
            { label: '企業版', value: stats.enterprise, icon: '🏢', color: 'from-blue-500 to-indigo-600' },
            { label: '一般用戶', value: stats.user, icon: '🪙', color: 'from-slate-400 to-slate-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-lg mb-3`}>
                {stat.icon}
              </div>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* User List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4">
            <h2 className="font-bold text-slate-800 dark:text-white flex-1">用戶清單</h2>
            <input
              type="text"
              placeholder="搜尋用戶..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-60"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-4xl mb-3">🔍</p>
              <p>找不到符合的用戶</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filtered.map(user => (
                <div key={user.uid} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  {/* Avatar */}
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-slate-600 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.displayName || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>

                  {/* Points */}
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-slate-500 dark:text-slate-400">算力點數</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-white">
                      {user.points >= 99000 ? '∞ 無限' : user.points}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${ROLE_LABELS[user.role]?.color} whitespace-nowrap`}>
                    {ROLE_LABELS[user.role]?.label}
                  </span>

                  {/* Action */}
                  {user.role !== 'admin' && (
                    <div className="flex gap-2 flex-shrink-0">
                      {user.role === 'user' ? (
                        <button
                          onClick={() => handleRoleChange(user.uid, 'enterprise')}
                          disabled={updatingUid === user.uid}
                          className="text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {updatingUid === user.uid ? '...' : '升級企業'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(user.uid, 'user')}
                          disabled={updatingUid === user.uid}
                          className="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-700 dark:text-white font-bold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {updatingUid === user.uid ? '...' : '降為一般'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
