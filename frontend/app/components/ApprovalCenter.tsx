"use client";

import React, { useState } from "react";
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
  MessageSquare
} from "lucide-react";

interface ApprovalCenterProps {
  state: any;
  safe: any;
  api: any;
  refresh: any;
  notify: any;
  openDoc: (id: string) => void;
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
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "ALL">("PENDING");

  const isReviewerOrManager = ["reviewer", "manager"].includes(state.actor.role);

  const handleApprove = (d: any) => {
    if (d.creatorId === state.actor.id) {
      return notify({
        error: true,
        text: "Separation of duties violation: Authors cannot self-approve documents for release. Switch to Reviewer or Manager role.",
      });
    }
    if (!isReviewerOrManager) {
      return notify({
        error: true,
        text: "Authorisation required: Switch to Reviewer or Manager role to approve.",
      });
    }

    safe(async () => {
      await api("/documents/" + d.id + "/approve", "POST", { consent: true });
      await refresh();
    }, `Document ${d.id} approved. Ed25519 cryptographic release receipt generated.`);
  };

  const handleReject = (d: any) => {
    if (!rejectionReason.trim()) {
      return notify({
        error: true,
        text: "Please provide an actionable compliance rejection note.",
      });
    }
    safe(async () => {
      await api("/documents/" + d.id + "/decision", "POST", {
        outcome: "rejected",
        reason: rejectionReason,
      });
      setRejectingDocId(null);
      setRejectionReason("");
      await refresh();
    }, `Document ${d.id} rejected. Status marked as Needs Changes.`);
  };

  const pendingDocs = state.documents.filter(
    (d: any) => d.status === "Awaiting review" || (!d.decision && d.submitted)
  );
  const approvedDocs = state.documents.filter(
    (d: any) => d.decision?.outcome === "approved" || d.readiness?.eligible
  );

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
                Human Approval Center
                <span className="badge badge-emerald text-xs">Version Bound</span>
              </h2>
              <p className="text-sm text-slate-400">
                Four-eyes principle governance: Approvals are cryptographically bound to exact document content hashes.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
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

      {/* Document Queue */}
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
                          Revision {doc.revision}
                        </span>
                        <span
                          className={`badge text-[10px] font-mono ${
                            isApproved
                              ? "badge-emerald"
                              : doc.status === "Awaiting review"
                              ? "badge-purple"
                              : "badge-amber"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1">
                        Fingerprint: {doc.fingerprint ? doc.fingerprint.substring(0, 24) + "..." : "sha256:pending"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => openDoc(doc.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                    >
                      Open in Reviewer <ArrowRight className="w-3.5 h-3.5" />
                    </button>

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

                    {isApproved && onVerifyReceipt && (
                      <button
                        onClick={onVerifyReceipt}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" /> View Cryptographic Receipt
                      </button>
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
