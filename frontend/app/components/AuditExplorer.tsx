"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Hash,
  Clock,
  User,
  FileText,
  Lock,
  ExternalLink,
  Info
} from "lucide-react";

interface AuditEvent {
  id: string;
  sequence?: number;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  hash: string;
  prev_hash?: string;
  details?: Record<string, any>;
}

interface VerificationReport {
  valid: boolean;
  totalEvents: number;
  genesisHash: string;
  headHash: string;
  message: string;
  brokenIndex?: number;
}

interface AuditExplorerProps {
  apiBase?: string;
  api?: (path: string, method?: string, data?: any) => Promise<any>;
  initialEvents?: any[];
}

export default function AuditExplorer({ apiBase = "", api, initialEvents = [] }: AuditExplorerProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [verifying, setVerifying] = useState(false);
  const [verifyReport, setVerifyReport] = useState<VerificationReport | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const normalizeEvents = (rawList: any[]) => {
    return rawList.map((ev: any) => ({
      id: ev.id,
      sequence: ev.seq !== undefined ? ev.seq : ev.sequence,
      timestamp: ev.at || ev.timestamp,
      actor: typeof ev.actor === "object" ? ev.actor?.name : ev.actor,
      actorRole: ev.actorRole || ev.actor?.role,
      action: ev.action,
      resource: ev.resource,
      hash: ev.eventHash || ev.hash,
      prev_hash: ev.prevHash || ev.prev_hash,
      details: ev.extra || { detail: ev.detail },
      detail: ev.detail || (typeof ev.details === "string" ? ev.details : ""),
    }));
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let json: any[];
      if (api) {
        json = await api("/events");
      } else {
        const res = await fetch(`${apiBase}/api/events`, { credentials: "include" });
        if (res.ok) json = await res.json();
        else json = initialEvents;
      }
      const rawList = Array.isArray(json) ? json : initialEvents;
      setEvents(normalizeEvents(rawList));
    } catch {
      setEvents(normalizeEvents(initialEvents));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      setEvents(normalizeEvents(initialEvents));
    }
    fetchEvents();
  }, [initialEvents]);

  const handleVerifyLedger = async () => {
    setVerifying(true);
    try {
      let data: any;
      if (api) {
        data = await api("/audit/verify");
      } else {
        const res = await fetch(`${apiBase}/api/audit/verify`, { credentials: "include" });
        if (res.ok) data = await res.json();
      }
      if (data) {
        setVerifyReport(data);
      }
    } catch {
      setVerifyReport({
        valid: false,
        totalEvents: events.length,
        genesisHash: "N/A",
        headHash: "N/A",
        message: "Failed to connect to verification endpoint.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleExport = async (format: "json" | "csv") => {
    try {
      const res = await fetch(`/api/audit/export?format=${format}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proofline-audit-ledger.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Failed to export audit ledger: " + e.message);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesAction = filterAction === "ALL" || e.action === filterAction;
    const matchesSearch =
      (e.action && e.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.actor && e.actor.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.resource && e.resource.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.hash && e.hash.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  const uniqueActions = ["ALL", ...Array.from(new Set(events.map((e) => e.action)))];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-glass border border-slate-700/60 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Cryptographic Audit Explorer
                <span className="badge badge-emerald text-xs">SHA-256 Chained</span>
              </h2>
              <p className="text-sm text-slate-400">
                Append-only tamper-evident compliance ledger binding every document review, policy change, and approval.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleVerifyLedger}
            disabled={verifying}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            {verifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying Hashes...
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" /> Verify Chain Integrity
              </>
            )}
          </button>

          <button
            onClick={() => handleExport("csv")}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={() => handleExport("json")}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> JSON
          </button>
        </div>
      </div>

      {/* Verification Notice / Banner */}
      {verifyReport && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
            verifyReport.valid
              ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-300"
              : "bg-rose-950/20 border-rose-500/50 text-rose-300"
          }`}
        >
          <div className="flex items-start gap-3">
            {verifyReport.valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5" />
            )}
            <div>
              <h4 className="text-sm font-bold">
                {verifyReport.valid ? "Cryptographic Chain Verified Valid" : "Tamper Alert: Hash Chain Mismatch"}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">{verifyReport.message}</p>
              <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-slate-400">
                <span>Verified Events: {verifyReport.totalEvents}</span>
                <span className="truncate max-w-[200px]">Head Hash: {verifyReport.headHash}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setVerifyReport(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="card-glass p-4 rounded-xl border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, actor, resource, hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {uniqueActions.slice(0, 6).map((action) => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              className={`text-xs px-2.5 py-1 rounded-md whitespace-nowrap transition-all font-mono ${
                filterAction === action
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-800/40 text-slate-400 hover:text-slate-300"
              }`}
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card-glass rounded-xl border border-slate-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">SEQ</th>
                <th className="py-3 px-4">TIMESTAMP</th>
                <th className="py-3 px-4">ACTION</th>
                <th className="py-3 px-4">ACTOR</th>
                <th className="py-3 px-4">RESOURCE</th>
                <th className="py-3 px-4">SHA-256 HASH</th>
                <th className="py-3 px-4 text-right">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {filteredEvents.map((ev, index) => (
                <tr
                  key={ev.id || index}
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(ev)}
                >
                  <td className="py-3 px-4 text-cyan-400 font-bold">
                    #{ev.sequence !== undefined ? ev.sequence : filteredEvents.length - index}
                  </td>
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : "N/A"}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`badge text-[10px] ${
                        ev.action.includes("APPROVED") || ev.action.includes("RELEASED")
                          ? "badge-emerald"
                          : ev.action.includes("REJECTED") || ev.action.includes("REVOKED")
                          ? "badge-rose"
                          : ev.action.includes("VERIFY")
                          ? "badge-purple"
                          : "badge-blue"
                      }`}
                    >
                      {ev.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-medium">
                    {ev.actor || "system"}
                  </td>
                  <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]">
                    {ev.resource || "workspace"}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 text-[10px] text-cyan-300 font-mono">
                      {ev.hash ? ev.hash.substring(0, 14) + "..." : "genesis"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(ev);
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Threat Model & Limitations Notice */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Security & Integrity Model:</span>{" "}
          Audit records are strictly append-only and linked via SHA-256 preimages where{" "}
          <code className="text-cyan-300">Hash(n) = SHA256(Seq + Action + Actor + PrevHash)</code>.
          Any retroactive database row deletion or alteration instantly breaks head hash verification.
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Audit Event Preimage Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">EVENT ID</span>
                <span className="text-white font-bold">{selectedEvent.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">ACTION</span>
                  <span className="text-cyan-300 font-bold">{selectedEvent.action}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">ACTOR</span>
                  <span className="text-slate-200">{selectedEvent.actor}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">SHA-256 BLOCK HASH</span>
                <span className="text-emerald-400 break-all select-all font-bold">
                  {selectedEvent.hash}
                </span>
              </div>

              {selectedEvent.prev_hash && (
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">PREVIOUS BLOCK HASH</span>
                  <span className="text-slate-400 break-all">{selectedEvent.prev_hash}</span>
                </div>
              )}

              {selectedEvent.details && (
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] mb-1">EVENT METADATA PAYLOAD</span>
                  <pre className="text-[11px] text-slate-300 overflow-x-auto p-2 bg-slate-950 rounded">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
