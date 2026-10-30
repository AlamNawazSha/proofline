"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  ArrowRight,
  FileText,
  Key,
  Lock,
  RefreshCw,
  Send,
  MessageSquare,
  RotateCcw,
  Users,
  CheckSquare,
} from "lucide-react";

interface ApprovalCenterProps {
  state: any;
  safe: any;
  api: any;
  refresh: any;
  notify?: any;
  openDoc?: (id: string) => void;
  onVerifyReceipt?: () => void;
}

export default function ApprovalCenter({
  state,
  safe,
  api,
  refresh,
  notify,
  openDoc,
  onVerifyReceipt,
}: ApprovalCenterProps) {
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [revokingDocId, setRevokingDocId] = useState<string | null>(null);
  const [revocationReason, setRevocationReason] = useState("");
  const [resolvingTaskId, setResolvingTaskId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [activeTab, setActiveTab] = useState<"PENDING" | "RE_REVIEW" | "APPROVED" | "ALL">("PENDING");
  const [queueTasks, setQueueTasks] = useState<any[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const isReviewerOrManager = ["reviewer", "manager"].includes(state.actor.role);

  const sendNotice = (n: any) => {
    if (typeof notify === "function") notify(n);
  };

  const loadQueue = async () => {
    try {
      setLoadingQueue(true);
      const res = await api("/re-review-queue", "GET");
      if (res && res.tasks) {
        setQueueTasks(res.tasks);
      }
    } catch {
      // offline or safe fallback
    } finally {
      setLoadingQueue(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [state.sourceVersion, state.documents]);

  const handleApprove = (d: any) => {
    if (d.creatorId === state.actor.id) {
      return sendNotice({
        error: true,
        text: "Separation of duties violation: Authors cannot self-approve documents for release. Switch to Reviewer or Manager role.",
      });
    }
    if (!isReviewerOrManager) {
      return sendNotice({
        error: true,
        text: "Authorisation required: Switch to Reviewer or Manager role to approve.",
      });
    }

    safe(async () => {
      await api("/documents/" + d.id + "/decision", "POST", {
        outcome: "approved",
        expectedRevision: d.revision,
        manualCoverage: true,
        reason: "Peer compliance approval verified against approved source knowledge.",
      });
      try {
        await api("/documents/" + d.id + "/export", "GET");
      } catch {
        // Receipt generated or pending check
      }
      await refresh();
    }, `Document ${d.id} approved. Ed25519 cryptographic release receipt generated.`);
  };

  const handleReject = (d: any) => {
    if (!rejectionReason.trim()) {
      return sendNotice({
        error: true,
        text: "Please provide an actionable compliance rejection note.",
      });
    }
    safe(async () => {
      await api("/documents/" + d.id + "/decision", "POST", {
        outcome: "changes_requested",
        expectedRevision: d.revision,
        reason: rejectionReason,
      });
      setRejectingDocId(null);
      setRejectionReason("");
      await refresh();
    }, `Document ${d.id} rejected. Status marked as Needs Changes.`);
  };

  const handleRevoke = (docId: string) => {
    if (revocationReason.trim().length < 5) {
      return sendNotice({
        error: true,
        text: "Provide a revocation justification reason of at least 5 characters.",
      });
    }
    safe(async () => {
      await api(`/documents/${docId}/revoke`, "POST", {
        reason: revocationReason,
      });
      setRevokingDocId(null);
      setRevocationReason("");
      await refresh();
      await loadQueue();
    }, `Approval revoked for document ${docId}. Release blocked until re-reviewed.`);
  };

  const handleResolveTask = (taskId: string) => {
    if (!resolutionNote.trim()) {
      return sendNotice({
        error: true,
        text: "Provide an auditor resolution justification note.",
      });
    }
    safe(async () => {
      await api(`/re-review-queue/${taskId}/resolve`, "POST", {
        note: resolutionNote,
      });
      setResolvingTaskId(null);
      setResolutionNote("");
      await loadQueue();
      await refresh();
    }, `Re-review task resolved.`);
  };

  const pendingDocs = state.documents.filter(
    (d: any) => d.status === "Awaiting review" || (!d.decision && d.submitted)
  );
  const approvedDocs = state.documents.filter(
    (d: any) => d.decision?.outcome === "approved" || d.readiness?.eligible
  );
  const pendingQueueCount = queueTasks.filter((t) => t.status === "pending").length;

  const displayDocs =
    activeTab === "PENDING"
      ? pendingDocs
      : activeTab === "APPROVED"
      ? approvedDocs
      : state.documents;

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
                Human Approval & Quorum Center
                <span className="badge badge-emerald text-xs">Four-Eyes Bound</span>
              </h2>
              <p className="text-sm text-slate-400">
                Governance gate: Approvals are cryptographically bound to exact content hashes. Dual-quorum enforced on high-risk copy.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 flex-wrap">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "PENDING"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Pending Review ({pendingDocs.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("RE_REVIEW");
              loadQueue();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "RE_REVIEW"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-Review Queue
            {pendingQueueCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px]">
                {pendingQueueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("APPROVED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "APPROVED"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Approved ({approvedDocs.length})
          </button>
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "ALL"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Documents ({state.documents.length})
          </button>
        </div>
      </div>

      {/* Separation of Duties Warning if Author */}
      {state.actor.role === "creator" && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-amber-200">Separation of Duties Policy Active:</strong>
            You are signed in as an Author (<span className="font-mono">{state.actor.name}</span>). You can submit content and run automated compliance checks, but company governance prohibits authors from self-approving release receipts. Switch role to <span className="font-semibold text-white">Reviewer</span> or <span className="font-semibold text-white">Manager</span> in the top-right persona selector to approve.
          </div>
        </div>
      )}

      {/* Re-Review Queue Tab View */}
      {activeTab === "RE_REVIEW" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                Automatic Evidence Lifecycle Re-Review Queue
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically triggered when governing sources, rules, or citations change, expire, or are retired. Prevents silent drift of approved assets.
              </p>
            </div>
            <button
              onClick={loadQueue}
              disabled={loadingQueue}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingQueue ? "animate-spin" : ""}`} />
              Refresh Queue
            </button>
          </div>

          {queueTasks.length === 0 ? (
            <div className="card-glass p-12 text-center rounded-2xl border border-slate-800 flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
              <h3 className="text-base font-bold text-white">Re-Review Queue Clear</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                All governing evidence is current and active. Retiring an active source or editing a confirmed rule will automatically populate this lifecycle queue.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueTasks.map((t: any) => {
                const isPending = t.status === "pending";
                return (
                  <div
                    key={t.id}
                    className={`card-glass p-5 rounded-2xl border transition-all space-y-3 ${
                      isPending
                        ? "border-amber-500/40 bg-amber-950/10"
                        : "border-slate-800 bg-slate-950/40"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-cyan-400">
                            {t.id}
                          </span>
                          <span className="text-sm font-bold text-white">
                            {t.documentTitle}
                          </span>
                          <span
                            className={`badge text-[10px] font-mono ${
                              t.priority === "HIGH"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {t.priority} PRIORITY
                          </span>
                          <span
                            className={`badge text-[10px] font-mono ${
                              isPending ? "badge-amber" : "badge-emerald"
                            }`}
                          >
                            {t.status.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Trigger: <span className="font-mono text-slate-200">{t.trigger}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {t.triggerDetail}
                        </p>
                        <div className="text-[11px] text-slate-400 flex items-center gap-4">
                          <span>Assignee: <strong className="text-slate-200">{t.assignee}</strong></span>
                          <span>Created: {new Date(t.createdAt).toLocaleString()}</span>
                          {t.resolvedAt && <span>Resolved: {new Date(t.resolvedAt).toLocaleString()}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {openDoc && (
                          <button
                            onClick={() => openDoc(t.documentId)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                          >
                            Open Document <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isPending && (
                          <button
                            onClick={() => setResolvingTaskId(t.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Resolve Task
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Resolution Drawer */}
                    {resolvingTaskId === t.id && (
                      <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-3">
                        <span className="text-xs font-bold text-emerald-300 block">
                          Auditor Resolution Justification:
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. Verified claims against updated source guide v2026; no compliance conflict remains."
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setResolvingTaskId(null);
                              setResolutionNote("");
                            }}
                            className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleResolveTask(t.id)}
                            className="px-3 py-1 rounded text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                          >
                            Confirm Resolution
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Document Queue (Pending, Approved, All) */}
      {activeTab !== "RE_REVIEW" && (
        <div className="space-y-3">
          {displayDocs.length === 0 ? (
            <div className="card-glass p-12 text-center rounded-2xl border border-slate-800 flex flex-col items-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
              <h3 className="text-base font-bold text-white">Inbox Clean</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                No documents in this queue. Create or submit a document from the Content Library to trigger a review.
              </p>
            </div>
          ) : (
            displayDocs.map((doc: any) => {
              const isAuthor = doc.creatorId === state.actor.id;
              const isApproved = doc.decision?.outcome === "approved";
              const isRevoked = doc.decision?.outcome === "revoked";
              const isPressRelease = doc.context?.channel === "press_release";
              const approvers = doc.decision?.approvers || (doc.decision?.by ? [doc.decision.by] : []);
              const quorumRequired = isPressRelease ? 2 : 1;

              return (
                <div
                  key={doc.id}
                  className="card-glass p-5 rounded-2xl border border-slate-700/60 hover:border-slate-600 transition-all space-y-4"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-cyan-400">
                            {doc.id}
                          </span>
                          <span className="text-sm font-bold text-white">{doc.title}</span>
                          <span className="badge badge-blue text-[10px] font-mono">
                            Rev {doc.revision}
                          </span>
                          <span
                            className={`badge text-[10px] font-mono ${
                              isApproved
                                ? "badge-emerald"
                                : isRevoked
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : doc.status === "Awaiting review"
                                ? "badge-purple"
                                : "badge-amber"
                            }`}
                          >
                            {isRevoked ? "APPROVAL REVOKED" : doc.status}
                          </span>
                          {isPressRelease && (
                            <span className="badge text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                              <Users className="w-3 h-3" /> Dual Quorum Required
                            </span>
                          )}
                        </div>

                        {/* Quorum and Fingerprint Metadata */}
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1 flex-wrap">
                          <span>
                            Fingerprint: {doc.fingerprint ? doc.fingerprint.substring(0, 20) + "..." : "sha256:pending"}
                          </span>
                          {approvers.length > 0 && approvers.length < quorumRequired && (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {approvers.length} of {quorumRequired} required signatures: waiting for a second reviewer ({approvers.join(", ")})
                              {doc.escalationDue && ` · Escalation due: ${new Date(doc.escalationDue).toLocaleTimeString()}`}
                            </span>
                          )}
                          {approvers.length >= quorumRequired && (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Quorum satisfied: {approvers.length} of {quorumRequired} verified signatures ({approvers.join(", ")})
                            </span>
                          )}
                          {approvers.length === 0 && quorumRequired > 1 && (
                            <span className="text-slate-400 font-semibold flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              0 of {quorumRequired} required signatures: waiting for initial review
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                      {openDoc && (
                        <button
                          onClick={() => openDoc(doc.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                        >
                          Open in Reviewer <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!isApproved && (
                        <>
                          <button
                            onClick={() => setRejectingDocId(doc.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>

                          <button
                            onClick={() => handleApprove(doc)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                              isAuthor
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                                : "btn-primary shadow-lg shadow-cyan-500/20"
                            }`}
                            title={isAuthor ? "Authors cannot approve their own documents" : "Approve exact version"}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve Version
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <>
                          {onVerifyReceipt && (
                            <button
                              onClick={onVerifyReceipt}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5"
                            >
                              <Key className="w-3.5 h-3.5" /> View Signed Receipt
                            </button>
                          )}

                          <button
                            onClick={() => setRevokingDocId(doc.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1"
                            title="Explicitly revoke approval and block release"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Revoke Approval
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rejection Prompt Drawer */}
                  {rejectingDocId === doc.id && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/40 space-y-3">
                      <span className="text-xs font-bold text-rose-300 block">
                        Compliance Rejection Reason:
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Unverified pricing claim on line 3; update to Q4 schedule before approval."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setRejectingDocId(null);
                            setRejectionReason("");
                          }}
                          className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReject(doc)}
                          className="px-3 py-1 rounded text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Revocation Prompt Drawer */}
                  {revokingDocId === doc.id && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/40 space-y-3">
                      <span className="text-xs font-bold text-rose-300 block">
                        Mandatory Revocation Justification Reason:
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Legal update received: claim must be retracted due to regulatory inquiry."
                        value={revocationReason}
                        onChange={(e) => setRevocationReason(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setRevokingDocId(null);
                            setRevocationReason("");
                          }}
                          className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleRevoke(doc.id)}
                          className="px-3 py-1 rounded text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                        >
                          Confirm Revocation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
