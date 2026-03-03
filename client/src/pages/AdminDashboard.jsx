// src/pages/AdminDashboard.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Users,
  Shield,
  Zap,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Crown,
  UserX,
  RefreshCw,
  BarChart3,
  Activity,
  LogOut,
  AlertTriangle,
  History,
  FlaskConical,
  BarChart2,
  BookTemplate,
} from "lucide-react";
import "./AdminDashboard.css";

const API_BASE = "http://localhost:5000";

const ROLE_CONFIG = {
  admin: { label: "Admin", cls: "role-admin" },
  premium: { label: "Pro", cls: "role-premium" },
  free: { label: "Free", cls: "role-free" },
};

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`stat-card ${accent || ""}`}>
      <div className="stat-icon-wrap">
        <Icon size={18} />
      </div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="adm-overlay" onClick={onCancel}>
      <div className="adm-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <AlertTriangle size={32} className="confirm-icon" />
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-danger-confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (user && user.role !== "admin") navigate("/");
  }, [user, navigate]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        role: roleFilter,
        page,
        limit: 15,
      });
      const res = await fetch(`${API_BASE}/api/admin/users?${params}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token, search, roleFilter, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    if (tab === "users") fetchUsers();
  }, [fetchUsers, tab]);

  const updateRole = async (userId, role) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u._id === userId ? data.user : u)));
        showToast(`Role updated to ${role}`);
        fetchStats();
      } else showToast(data.error || "Failed to update", "error");
    } catch {
      showToast("Network error", "error");
    }
  };

  const deleteUser = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u._id !== userId));
        setTotal((t) => t - 1);
        showToast("User deleted");
        fetchStats();
      } else showToast("Failed to delete", "error");
    } catch {
      showToast("Network error", "error");
    }
  };

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.action === "delete") deleteUser(confirm.userId);
    if (confirm.action === "role") updateRole(confirm.userId, confirm.role);
    setConfirm(null);
  };

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        })
      : "—";

  const isPro = (u) => u.role === "premium" || u.role === "admin";

  if (!user || user.role !== "admin") return null;

  return (
    <div className="adm-root">
      {/* ── Sidebar ── */}
      <aside className="adm-sidebar">
        <div className="adm-logo">
          <Shield size={20} className="adm-logo-icon" />
          <span className="adm-logo-text">Admin</span>
        </div>

        <nav className="adm-nav">
          <button
            className={`adm-nav-btn ${tab === "overview" ? "active" : ""}`}
            onClick={() => setTab("overview")}
          >
            <BarChart3 size={16} />
            <span>Overview</span>
          </button>
          <button
            className={`adm-nav-btn ${tab === "users" ? "active" : ""}`}
            onClick={() => setTab("users")}
          >
            <Users size={16} />
            <span>Users</span>
          </button>
        </nav>

        <div className="adm-sidebar-footer">
          <div className="adm-current-user">
            <div className="adm-avatar">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="adm-uname">{user.username}</div>
              <div className="adm-urole">admin</div>
            </div>
          </div>
          <button
            className="adm-logout"
            title="Logout"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="adm-main">
        {/* ══ OVERVIEW ══ */}
        {tab === "overview" && (
          <div className="adm-section">
            <div className="adm-header">
              <h1>Overview</h1>
              <button
                className="btn-refresh"
                onClick={fetchStats}
                disabled={statsLoading}
              >
                <RefreshCw size={13} className={statsLoading ? "spin" : ""} />{" "}
                Refresh
              </button>
            </div>

            {statsLoading && !stats ? (
              <div className="adm-loading">
                <RefreshCw size={22} className="spin" />
              </div>
            ) : stats ? (
              <>
                <div className="stats-grid">
                  <StatCard
                    icon={Users}
                    label="Total Users"
                    value={stats.stats.totalUsers}
                    accent="accent-blue"
                  />
                  <StatCard
                    icon={UserX}
                    label="Free Users"
                    value={stats.stats.freeUsers}
                  />
                  <StatCard
                    icon={Crown}
                    label="Pro Users"
                    value={stats.stats.premiumUsers}
                    accent="accent-gold"
                    sub={`${stats.stats.conversionRate}% conversion`}
                  />
                  <StatCard
                    icon={Activity}
                    label="Active Today"
                    value={stats.stats.activeToday}
                    accent="accent-green"
                  />
                  <StatCard
                    icon={Zap}
                    label="AI Calls Today"
                    value={stats.stats.totalAIUsage}
                    accent="accent-purple"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Admins"
                    value={stats.stats.adminUsers}
                  />
                </div>

                <div className="adm-recent">
                  <h2>Recent Sign-ups</h2>
                  <div className="recent-list">
                    {stats.recentUsers?.map((u) => (
                      <div key={u._id} className="recent-row">
                        <div className="recent-avatar">
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="recent-info">
                          <div className="recent-name">{u.username}</div>
                          <div className="recent-email">{u.email}</div>
                        </div>
                        <span
                          className={`role-badge ${ROLE_CONFIG[u.role]?.cls}`}
                        >
                          {ROLE_CONFIG[u.role]?.label}
                        </span>
                        <span className="recent-date">
                          {formatDate(u.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="adm-empty">Failed to load stats</div>
            )}
          </div>
        )}

        {/* ══ USERS ══ */}
        {tab === "users" && (
          <div className="adm-section">
            <div className="adm-header">
              <h1>
                Users <span className="total-badge">{total}</span>
              </h1>
              <button
                className="btn-refresh"
                onClick={fetchUsers}
                disabled={loading}
              >
                <RefreshCw size={13} className={loading ? "spin" : ""} />{" "}
                Refresh
              </button>
            </div>

            <div className="adm-filters">
              <div className="search-wrap">
                <Search size={14} />
                <input
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All roles</option>
                <option value="free">Free</option>
                <option value="premium">Pro</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="adm-table-wrap">
              {loading ? (
                <div className="adm-loading">
                  <RefreshCw size={22} className="spin" />
                </div>
              ) : (
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Zap size={11} />
                          AI / Day
                        </span>
                      </th>
                      <th>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <FlaskConical size={11} />
                          Interviews
                        </span>
                      </th>
                      <th>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <History size={11} />
                          Versions
                        </span>
                      </th>
                      <th>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <BarChart2 size={11} />
                          Complexity
                        </span>
                      </th>
                      <th>
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <BookTemplate size={11} />
                          Templates
                        </span>
                      </th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="empty-row">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const pro = isPro(u);
                        return (
                          <tr
                            key={u._id}
                            className={u._id === user.id ? "own-row" : ""}
                          >
                            {/* User */}
                            <td>
                              <div className="user-cell">
                                <div className="tbl-avatar">
                                  {u.username?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="tbl-name">
                                    {u.username}
                                    {u._id === user.id && (
                                      <span className="you-tag">you</span>
                                    )}
                                  </div>
                                  <div className="tbl-email">{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Role */}
                            <td>
                              <span
                                className={`role-badge ${ROLE_CONFIG[u.role]?.cls}`}
                              >
                                {ROLE_CONFIG[u.role]?.label}
                              </span>
                            </td>

                            {/* AI / Day  — free: 5/day, pro: ∞ */}
                            <td>
                              {pro ? (
                                <span className="feat-pill inf">∞</span>
                              ) : (
                                <span className="usage-num">
                                  {u.aiUsage?.count ?? 0} / 5
                                </span>
                              )}
                            </td>

                            {/* Interviews — free: 2/day (easy only), pro: ∞ all difficulties */}
                            <td>
                              {pro ? (
                                <span className="feat-pill inf">∞</span>
                              ) : (
                                <span className="usage-num">
                                  {u.interviewUsage?.count ?? 0} / 2
                                </span>
                              )}
                            </td>

                            {/* Versions — free: 3 saves per room, pro: ∞ */}
                            <td>
                              {pro ? (
                                <span className="feat-pill inf">∞</span>
                              ) : (
                                <span className="usage-num">
                                  {u.versionCount ?? 0} / 3
                                </span>
                              )}
                            </td>

                            {/* Complexity — free: basic only, pro: full analysis */}
                            <td>
                              {pro ? (
                                <span className="feat-pill on">✓ Full</span>
                              ) : (
                                <span className="feat-pill off">Basic</span>
                              )}
                            </td>

                            {/* Templates — free: Basic + DSA, pro: all */}
                            <td>
                              {pro ? (
                                <span className="feat-pill on">All</span>
                              ) : (
                                <span className="feat-pill off">
                                  Basic + DSA
                                </span>
                              )}
                            </td>

                            {/* Joined */}
                            <td className="date-cell">
                              {formatDate(u.createdAt)}
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="action-row">
                                {u.role !== "premium" && (
                                  <button
                                    className="act-btn upgrade"
                                    title="Upgrade to Pro"
                                    onClick={() =>
                                      setConfirm({
                                        action: "role",
                                        userId: u._id,
                                        role: "premium",
                                        message: `Upgrade "${u.username}" to Pro?`,
                                      })
                                    }
                                  >
                                    <Crown size={13} />
                                  </button>
                                )}
                                {u.role !== "free" && u._id !== user.id && (
                                  <button
                                    className="act-btn downgrade"
                                    title="Downgrade to Free"
                                    onClick={() =>
                                      setConfirm({
                                        action: "role",
                                        userId: u._id,
                                        role: "free",
                                        message: `Downgrade "${u.username}" to Free?`,
                                      })
                                    }
                                  >
                                    <UserX size={13} />
                                  </button>
                                )}
                                {u._id !== user.id && (
                                  <button
                                    className="act-btn delete"
                                    title="Delete user"
                                    onClick={() =>
                                      setConfirm({
                                        action: "delete",
                                        userId: u._id,
                                        message: `Permanently delete "${u.username}"? This cannot be undone.`,
                                      })
                                    }
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {totalPages > 1 && (
              <div className="adm-pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {toast && <div className={`adm-toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
