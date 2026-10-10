"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  LogOut,
  RotateCw,
  Search,
  ShieldCheck,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";
import AdminAnalytics from "@/components/AdminAnalytics";
import { Avatar, Segmented, cn } from "@/components/AdminUI";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE = `${API_ORIGIN}/api/admin`;

const PAGE_SIZE = 8;
const CONFIRM_TIMEOUT_MS = 5000;
const TOAST_MS = 4200;

const ROLE_FILTERS = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admins" },
  { value: "user", label: "Users" },
];

const CSS = `
@keyframes adRise {
  from { opacity: 0; transform: translateY(14px) }
  to { opacity: 1; transform: none }
}
@keyframes adToastIn {
  from { opacity: 0; transform: translateX(24px) scale(.96) }
  to { opacity: 1; transform: none }
}
@keyframes adFlash {
  from { background-color: rgba(59,130,246,.22) }
  to { background-color: transparent }
}
@keyframes adPop {
  from { opacity: 0; transform: scale(.92) }
  to { opacity: 1; transform: none }
}
@keyframes adFloat {
  0%, 100% { transform: translate3d(0,0,0) }
  50% { transform: translate3d(30px,24px,0) }
}
@keyframes adFloatSlow {
  0%, 100% { transform: translate3d(0,0,0) }
  50% { transform: translate3d(-36px,-20px,0) }
}
@keyframes adRing {
  0% { transform: scale(.85); opacity: .7 }
  100% { transform: scale(1.6); opacity: 0 }
}
@keyframes adShimmer {
  from { background-position: 200% 0 }
  to { background-position: -200% 0 }
}
.ad-rise { animation: adRise .6s cubic-bezier(.22,1,.36,1) backwards }
.ad-toast { animation: adToastIn .35s cubic-bezier(.22,1,.36,1) both }
.ad-flash { animation: adFlash 1.6s ease-out both }
.ad-pop { animation: adPop .18s ease-out both }
.ad-float { animation: adFloat 18s ease-in-out infinite }
.ad-float-slow { animation: adFloatSlow 24s ease-in-out infinite }
.ad-ring { animation: adRing 1.8s ease-out infinite }
.ad-shimmer {
  background: linear-gradient(90deg,
    rgba(30,41,59,.45) 25%, rgba(51,65,85,.55) 50%, rgba(30,41,59,.45) 75%);
  background-size: 200% 100%;
  animation: adShimmer 1.5s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .ad-rise, .ad-toast, .ad-flash, .ad-pop, .ad-float, .ad-float-slow,
  .ad-ring, .ad-shimmer { animation: none !important }
}
`;

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */
function BrandMark({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5 4.5 7v8.2c0 7 4.8 11.6 11.5 14.3 6.7-2.7 11.5-7.3 11.5-14.3V7L16 2.5Z"
        fill="url(#brand-grad)"
      />
      <path
        d="m10.5 16.2 3.6 3.6 7.4-7.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Highlight({ text, query }) {
  const value = String(text ?? "");
  const needle = query.trim();
  if (!needle) return value;

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = value.split(new RegExp(`(${escaped})`, "ig"));

  return parts.map((part, index) =>
    part.toLowerCase() === needle.toLowerCase() ? (
      <mark
        key={index}
        className="rounded bg-blue-500/25 px-0.5 text-blue-100"
      >
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  const Icon = isAdmin ? Crown : UserIcon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        isAdmin
          ? "border-red-500/30 bg-red-500/15 text-red-400"
          : "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {role}
    </span>
  );
}

function SortHeader({ label, sortKey, sort, onSort, align = "left" }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      className={cn("px-6 py-3.5", align === "right" && "text-right")}
      aria-sort={
        active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 uppercase transition-colors",
          active ? "text-white" : "text-slate-400 hover:text-slate-200"
        )}
      >
        {label}
        <Icon
          className={cn("h-3 w-3", !active && "opacity-50")}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

function ConsoleSkeleton() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-950 px-6">
      <style>{CSS}</style>

      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="ad-ring absolute inset-0 rounded-full border border-blue-500/50" />
        <span
          className="ad-ring absolute inset-0 rounded-full border border-violet-500/40"
          style={{ animationDelay: "0.9s" }}
        />
        <BrandMark className="relative h-12 w-12" />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-slate-200">
          Verifying administrator access
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Loading your console...
        </p>
      </div>

      <div className="w-full max-w-sm space-y-2">
        <div className="ad-shimmer h-2.5 w-full rounded-full" />
        <div className="ad-shimmer h-2.5 w-4/5 rounded-full" />
        <div className="ad-shimmer h-2.5 w-3/5 rounded-full" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function AdminDashboard() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Directory controls
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sort, setSort] = useState({ key: "id", dir: "asc" });
  const [page, setPage] = useState(1);

  // Role-change flow
  const [confirmId, setConfirmId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [flashId, setFlashId] = useState(null);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const searchRef = useRef(null);

  /* ----------------------------- Toasts ------------------------------ */
  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (type, message) => {
      const id = ++toastId.current;
      setToasts((current) => [...current.slice(-3), { id, type, message }]);
      setTimeout(() => dismissToast(id), TOAST_MS);
    },
    [dismissToast]
  );

  /* ------------------------------ Loading ---------------------------- */
  const loadConsole = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };

    setLoading(true);
    setLoadError("");

    Promise.all([
      axios.get(`${API_BASE}/me`, config),
      axios.get(`${API_BASE}/users`, config),
    ])
      .then(([meRes, usersRes]) => {
        setAdminUser(meRes.data);
        setUsers(usersRes.data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 403 || err.response?.status === 401) {
          router.push("/dashboard");
        } else {
          setLoadError("Failed to load admin console.");
          setLoading(false);
        }
      });
  }, [router]);

  useEffect(() => {
    loadConsole();
  }, [loadConsole]);

  /* ------------------------------ Effects ---------------------------- */
  // "/" focuses the search box
  useEffect(() => {
    const handleKey = (event) => {
      const tag = document.activeElement?.tagName;
      if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // A pending confirmation cancels itself after a few seconds
  useEffect(() => {
    if (confirmId === null) return;
    const timer = setTimeout(() => setConfirmId(null), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [confirmId]);

  /* ----------------------------- Directory --------------------------- */
  const adminCount = useMemo(
    () => users.filter((user) => user.role === "admin").length,
    [users]
  );

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const direction = sort.dir === "asc" ? 1 : -1;

    const rows = users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesQuery =
        !needle ||
        user.name?.toLowerCase().includes(needle) ||
        user.email?.toLowerCase().includes(needle);
      return matchesRole && matchesQuery;
    });

    return rows.sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];

      if (typeof left === "number" && typeof right === "number") {
        return (left - right) * direction;
      }
      return String(left ?? "").localeCompare(String(right ?? "")) * direction;
    });
  }, [users, query, roleFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredUsers.slice(pageStart, pageStart + PAGE_SIZE);

  const handleSort = (key) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
    setPage(1);
  };

  const handleRoleFilter = (value) => {
    setRoleFilter(value);
    setPage(1);
    setConfirmId(null);
  };

  const handleQuery = (event) => {
    setQuery(event.target.value);
    setPage(1);
    setConfirmId(null);
  };

  /* ------------------------------ Actions ---------------------------- */
  const handleRoleToggle = async (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    const token = localStorage.getItem("token");

    setConfirmId(null);
    setActionLoadingId(user.id);

    try {
      const res = await axios.patch(
        `${API_BASE}/users/${user.id}/role`,
        { role: nextRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers((previous) =>
        previous.map((item) =>
          item.id === user.id ? { ...item, role: res.data.role } : item
        )
      );

      setFlashId(user.id);
      setTimeout(() => setFlashId(null), 1700);

      pushToast(
        "success",
        `${user.name} is now ${
          res.data.role === "admin" ? "an administrator" : "a standard user"
        }.`
      );
    } catch (err) {
      pushToast(
        "error",
        err.response?.data?.detail || "Could not update user role."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  /* ------------------------------ Render ----------------------------- */
  if (loading) return <ConsoleSkeleton />;

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
        <style>{CSS}</style>
        <div className="ad-pop flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium text-red-300">{loadError}</p>
          <p className="mt-1 text-xs text-slate-500">
            Check that the API is running, then try again.
          </p>
        </div>
        <button
          type="button"
          onClick={loadConsole}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
        >
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = adminUser?.name?.split(" ")[0] || "Admin";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="relative isolate min-h-screen bg-slate-950 text-slate-100">
      <style>{CSS}</style>

      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(rgba(148,163,184,.16) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage:
              "radial-gradient(ellipse at top, black 15%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at top, black 15%, transparent 70%)",
          }}
        />
        <div className="ad-float absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <div className="ad-float-slow absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/70 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="leading-tight">
              <p className="font-semibold text-white">PhishGuard</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">
                Admin Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <Avatar
                name={adminUser?.name}
                seed={adminUser?.id}
                className="h-8 w-8 text-[11px]"
              />
              <div className="text-right leading-tight">
                <p className="text-xs font-medium text-white">
                  {adminUser?.name}
                </p>
                <p className="text-[10px] text-slate-500">Administrator</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
        {/* Greeting */}
        <div className="ad-rise">
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
            {today}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {greeting},{" "}
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Here is what is happening across PhishGuard.
          </p>
        </div>

        <AdminAnalytics />

        {/* Users directory */}
        <section
          className="ad-rise overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm"
          style={{ animationDelay: "120ms" }}
        >
          <div className="flex flex-col gap-4 border-b border-slate-800 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Registered users
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {users.length} accounts · {adminCount}{" "}
                  {adminCount === 1 ? "administrator" : "administrators"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={handleQuery}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setQuery("");
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="Search name or email"
                  aria-label="Search users"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-10 text-xs text-white placeholder:text-slate-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:w-64"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-700 bg-slate-900 px-1.5 text-[10px] text-slate-500">
                    /
                  </kbd>
                )}
              </div>

              <Segmented
                ariaLabel="Filter users by role"
                options={ROLE_FILTERS}
                value={roleFilter}
                onChange={handleRoleFilter}
                className="w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900 text-xs text-slate-400">
                <tr>
                  <SortHeader
                    label="User"
                    sortKey="name"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="ID"
                    sortKey="id"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Role"
                    sortKey="role"
                    sort={sort}
                    onSort={handleSort}
                  />
                  <th className="px-6 py-3.5 text-right uppercase">Actions</th>
                </tr>
              </thead>

              <tbody
                key={`${currentPage}-${roleFilter}-${sort.key}-${sort.dir}`}
                className="divide-y divide-slate-800/60"
              >
                {pageRows.map((user, index) => {
                  const isSelf = user.id === adminUser?.id;
                  const confirming = confirmId === user.id;
                  const busy = actionLoadingId === user.id;
                  const promoting = user.role !== "admin";

                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        "ad-rise transition-colors hover:bg-slate-800/30",
                        flashId === user.id && "ad-flash"
                      )}
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name} seed={user.id} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">
                              <Highlight text={user.name} query={query} />
                            </p>
                            <p className="truncate font-mono text-xs text-slate-500">
                              <Highlight text={user.email} query={query} />
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5 font-mono text-xs text-slate-500">
                        #{user.id}
                      </td>

                      <td className="px-6 py-3.5">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <div className="flex h-8 items-center justify-end">
                          {isSelf ? (
                            <span className="flex items-center gap-1.5 text-[11px] italic text-slate-500">
                              <ShieldCheck
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              Current session
                            </span>
                          ) : confirming ? (
                            <div className="ad-pop flex items-center gap-1.5">
                              <span className="mr-1 hidden text-[11px] text-slate-400 md:inline">
                                {promoting ? "Promote?" : "Demote?"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRoleToggle(user)}
                                aria-label={`Confirm ${
                                  promoting ? "promote" : "demote"
                                } ${user.name}`}
                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-500"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmId(null)}
                                aria-label="Cancel"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmId(user.id)}
                              disabled={busy}
                              className={cn(
                                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                                promoting
                                  ? "border border-red-500/30 bg-red-600/15 text-red-300 hover:bg-red-600/25"
                                  : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                              )}
                            >
                              {busy ? (
                                <RotateCw
                                  className="h-3.5 w-3.5 animate-spin"
                                  aria-hidden="true"
                                />
                              ) : promoting ? (
                                <Crown
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              ) : (
                                <UserIcon
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              )}
                              {busy
                                ? "Updating..."
                                : promoting
                                ? "Promote to Admin"
                                : "Demote to User"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="ad-pop flex flex-col items-center justify-center px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-600">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm font-medium text-slate-300">
                  No users match
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Try a different search or filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    handleRoleFilter("all");
                  }}
                  className="mt-4 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>

          {filteredUsers.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/40 px-6 py-3.5">
              <p className="text-xs tabular-nums text-slate-500">
                Showing{" "}
                <span className="text-slate-300">
                  {pageStart + 1}–{pageStart + pageRows.length}
                </span>{" "}
                of <span className="text-slate-300">{filteredUsers.length}</span>
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-20 text-center text-xs tabular-nums text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 transition hover:border-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Toasts */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const Icon = isError ? AlertTriangle : CheckCircle2;

          return (
            <div
              key={toast.id}
              role={isError ? "alert" : "status"}
              className={cn(
                "ad-toast pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl",
                isError
                  ? "border-red-500/30 bg-red-950/80 text-red-200"
                  : "border-emerald-500/30 bg-slate-900/90 text-slate-100"
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 flex-shrink-0",
                  isError ? "text-red-400" : "text-emerald-400"
                )}
                aria-hidden="true"
              />
              <p className="flex-1 text-xs leading-relaxed">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="text-slate-400 transition hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}