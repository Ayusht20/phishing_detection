"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function AdminDashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const API_BASE = "http://localhost:8000/api/admin";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const config = {
      headers: { Authorization: `Bearer ${token}` },
    };

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
          setErrorMessage("Failed to load admin console.");
          setLoading(false);
        }
      });
  }, [router]);

  const handleRoleToggle = async (userId, currentRole) => {
    const nextRole = currentRole === "admin" ? "user" : "admin";
    const token = localStorage.getItem("token");

    setActionLoadingId(userId);
    setErrorMessage("");

    try {
      const res = await axios.patch(
        `${API_BASE}/users/${userId}/role`,
        { role: nextRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: res.data.role } : u))
      );
    } catch (err) {
      setErrorMessage(
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-300">
        <p className="text-base font-medium animate-pulse">
          Authenticating administrator access...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 px-8 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded bg-red-500/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-red-400 border border-red-500/20">
              Admin Portal
            </span>
            <span className="font-semibold text-white">PhishGuard Management</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">
              Logged in as <strong className="text-white">{adminUser?.name}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-8 space-y-6">
        {errorMessage && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Total Accounts
            </p>
            <p className="mt-2 text-3xl font-extrabold text-white">{users.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Administrators
            </p>
            <p className="mt-2 text-3xl font-extrabold text-red-400">
              {users.filter((u) => u.role === "admin").length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Standard Users
            </p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-400">
              {users.filter((u) => u.role === "user").length}
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-sm">
          <div className="border-b border-slate-800 px-6 py-4">
            <h2 className="text-base font-semibold text-white">Registered Users Directory</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Promote standard accounts or demote administrators directly.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900 border-b border-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-6 text-slate-500">#{u.id}</td>
                    <td className="py-3.5 px-6 font-sans font-medium text-white">{u.name}</td>
                    <td className="py-3.5 px-6 text-slate-300">{u.email}</td>
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          u.role === "admin"
                            ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right font-sans">
                      {u.id === adminUser?.id ? (
                        <span className="text-[11px] text-slate-500 italic">Current Session</span>
                      ) : (
                        <button
                          onClick={() => handleRoleToggle(u.id, u.role)}
                          disabled={actionLoadingId === u.id}
                          className={`rounded px-3 py-1 text-xs font-semibold transition ${
                            u.role === "admin"
                              ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                              : "bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30"
                          } disabled:opacity-50`}
                        >
                          {actionLoadingId === u.id
                            ? "Updating..."
                            : u.role === "admin"
                            ? "Demote to User"
                            : "Promote to Admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}