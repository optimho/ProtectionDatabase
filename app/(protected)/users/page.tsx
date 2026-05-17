"use client";

import React, { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const emptyNew = { name: "", email: "", password: "", role: "user" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState(emptyNew);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Reset password state
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Edit role state
  const [editRoleFor, setEditRoleFor] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("user");

  const fetchUsers = useCallback(async () => {
    const r = await fetch("/api/admin/users");
    if (r.ok) setUsers(await r.json());
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(""); setAdding(true);
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    setAdding(false);
    if (!r.ok) { const j = await r.json(); setAddError(j.error ?? "Failed"); return; }
    setNewUser(emptyNew);
    setShowAdd(false);
    fetchUsers();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    fetchUsers();
  }

  async function handleRoleSave(id: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole }),
    });
    setEditRoleFor(null);
    fetchUsers();
  }

  async function handleResetPassword(id: string) {
    if (!newPassword || newPassword.length < 6) return;
    setResetting(true);
    await fetch(`/api/admin/users/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setResetting(false);
    setResetFor(null);
    setNewPassword("");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Admin-only — manage user accounts and privileges</p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          {showAdd ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg border border-slate-200 p-5 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">New User</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
              <input required type="text" value={newUser.name}
                onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                className={inp} placeholder="e.g. Jane Smith" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
              <input required type="email" value={newUser.email}
                onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                className={inp} placeholder="jane@contact.co.nz" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password * (min 6 chars)</label>
              <input required type="password" minLength={6} value={newUser.password}
                onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role *</label>
              <select value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))} className={inp}>
                <option value="user">User</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <button type="submit" disabled={adding}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
            {adding ? "Creating…" : "Create User"}
          </button>
        </form>
      )}

      {/* User table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {users.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No users found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <React.Fragment key={u.id}>
                  <tr className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      {editRoleFor === u.id ? (
                        <div className="flex items-center gap-2">
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="user">User</option>
                            <option value="admin">Administrator</option>
                          </select>
                          <button onClick={() => handleRoleSave(u.id)} className="text-xs text-blue-600 hover:underline">Save</button>
                          <button onClick={() => setEditRoleFor(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                          u.role === "admin"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {u.role === "admin" ? "Administrator" : "User"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{u.createdAt?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end text-xs">
                        <button onClick={() => { setEditRoleFor(u.id); setEditRole(u.role); }}
                          className="text-blue-600 hover:underline">Role</button>
                        <button onClick={() => { setResetFor(resetFor === u.id ? null : u.id); setNewPassword(""); }}
                          className="text-slate-500 hover:underline">Reset PW</button>
                        <button onClick={() => handleDelete(u.id, u.name)}
                          className="text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                  {resetFor === u.id && (
                    <tr className="border-t border-slate-100 bg-amber-50">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 font-medium">New password for {u.name}:</span>
                          <input type="password" minLength={6} value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="min 6 characters"
                            className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
                          <button onClick={() => handleResetPassword(u.id)} disabled={resetting || newPassword.length < 6}
                            className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 disabled:opacity-50">
                            {resetting ? "Saving…" : "Set Password"}
                          </button>
                          <button onClick={() => setResetFor(null)} className="text-xs text-slate-400 hover:underline">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
