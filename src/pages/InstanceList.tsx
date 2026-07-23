/* ─────────────────────────────────────────────
 *  InstanceList — landing page after login
 *
 *  Lists the user's simulation instances and lets
 *  them add, rename, delete, and open one. Opening
 *  navigates to /instance/:publicId (the editor).
 * ───────────────────────────────────────────── */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  listInstances,
  createInstance,
  updateInstance,
  deleteInstance,
  type InstanceSummary,
} from "../utils/api";
import { AddStormModal } from "../components/AddStormModal";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InstanceList() {
  const navigate = useNavigate();
  const { username, logout } = useAuth();

  const [rows, setRows] = useState<InstanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New-instance form
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Add-storm modal
  const [showAddStorm, setShowAddStorm] = useState(false);

  // Inline rename
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listInstances());
    } catch (e: any) {
      setError(e.message ?? "Failed to load instances");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createInstance(newName.trim(), newDesc.trim() || undefined);
      setShowNew(false);
      setNewName("");
      setNewDesc("");
      // Jump straight into the new instance
      navigate(`/instance/${created.public_id}`);
    } catch (e: any) {
      setError(e.message ?? "Could not create instance");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (publicId: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await updateInstance(publicId, { name: editName.trim() });
      setEditingId(null);
      await refresh();
    } catch (e: any) {
      setError(e.message ?? "Rename failed");
    }
  };

  const handleDelete = async (publicId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This removes its solution too.`)) return;
    try {
      await deleteInstance(publicId);
      setRows((prev) => prev.filter((r) => r.public_id !== publicId));
    } catch (e: any) {
      setError(e.message ?? "Delete failed");
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#0a0e17] text-white/90 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h1 className="font-mono text-sm font-semibold tracking-wide text-accent">
          Hidris Simulation Platform
          <span className="ml-2 font-normal text-dim text-xs">Instances</span>
        </h1>
        <button
          onClick={logout}
          className="font-mono text-xs text-dim hover:text-accent transition"
          title="Log out"
        >
          {username} · ↩
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Your simulations</h2>
            <p className="text-sm text-dim mt-0.5">
              Open one to edit its setup, or start a new simulation.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddStorm(true)}
              className="rounded-md px-4 py-2 text-sm font-semibold border border-white/15 text-white/80 hover:bg-white/5 transition"
            >
              🌧 Add storm
            </button>
            <button
              onClick={() => setShowNew((s) => !s)}
              className="rounded-md px-4 py-2 text-sm font-semibold bg-accent text-[#0a0e17] hover:bg-[#4ea8eb] transition"
            >
              + New simulation
            </button>
          </div>
        </div>

        {/* New-instance form */}
        {showNew && (
          <div className="panel p-4 mb-6 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="ctrl-label">Name</label>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="e.g. Túria channel, 100-yr event"
                className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="ctrl-label">Description (optional)</label>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Short note about this run"
                className="px-3 py-2 rounded-md bg-white/5 border border-white/10 text-sm outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNew(false)}
                className="rounded-md px-4 py-2 text-sm border border-white/15 text-white/80 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="rounded-md px-4 py-2 text-sm font-semibold bg-accent text-[#0a0e17] hover:bg-[#4ea8eb] transition disabled:opacity-40"
              >
                {creating ? "Creating…" : "Create & open"}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-md border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-4 py-2 text-sm text-[#ff6b6b]">
            {error}
          </div>
        )}

        {/* States */}
        {loading ? (
          <div className="flex items-center gap-3 text-dim text-sm py-12 justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
            Loading instances…
          </div>
        ) : rows.length === 0 ? (
          <div className="panel p-10 text-center">
            <p className="text-dim mb-4">No simulations yet.</p>
            <button
              onClick={() => setShowNew(true)}
              className="rounded-md px-4 py-2 text-sm font-semibold bg-accent text-[#0a0e17] hover:bg-[#4ea8eb] transition"
            >
              + Create your first one
            </button>
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dim border-b border-white/10">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.public_id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition group"
                  >
                    {/* Name (click to open, or inline-edit) */}
                    <td className="px-4 py-3">
                      {editingId === r.public_id ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleRename(r.public_id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(r.public_id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="px-2 py-1 rounded bg-white/10 border border-accent/40 text-sm outline-none w-full"
                        />
                      ) : (
                        <button
                          onClick={() => navigate(`/instance/${r.public_id}`)}
                          className="text-left font-medium text-white hover:text-accent transition"
                        >
                          {r.instance_name || "Untitled"}
                          {r.instance_description && (
                            <span className="block text-xs text-dim font-normal mt-0.5">
                              {r.instance_description}
                            </span>
                          )}
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          r.is_solved
                            ? "bg-[#22c55e]/15 text-[#22c55e]"
                            : "bg-white/10 text-dim"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            r.is_solved ? "bg-[#22c55e]" : "bg-dim"
                          }`}
                        />
                        {r.is_solved ? "Solved" : "Not solved"}
                      </span>
                    </td>

                    {/* Updated */}
                    <td className="px-4 py-3 text-dim font-mono text-xs">
                      {formatDate(r.updated_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition">
                        <button
                          onClick={() => navigate(`/instance/${r.public_id}`)}
                          className="rounded px-2.5 py-1 text-xs border border-white/15 hover:border-accent/40 hover:text-accent transition"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(r.public_id);
                            setEditName(r.instance_name || "");
                          }}
                          className="rounded px-2.5 py-1 text-xs border border-white/15 hover:border-white/30 transition"
                          title="Rename"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(r.public_id, r.instance_name || "Untitled")
                          }
                          className="rounded px-2.5 py-1 text-xs border border-[#ff6b6b]/30 text-[#ff6b6b] hover:bg-[#ff6b6b]/10 transition"
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showAddStorm && (
        <AddStormModal
          onCreated={() => {}}
          onClose={() => setShowAddStorm(false)}
        />
      )}
    </div>
  );
}
