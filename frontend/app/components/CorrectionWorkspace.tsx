"use client";

import React, { useState } from "react";
import {
  FileEdit,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Send,
  MessageSquare,
  History,
  Layers,
  Save,
  Check,
  X
} from "lucide-react";

interface Finding {
  id: string;
  claim: string;
  sourceText?: string;
  status: "SUPPORTED" | "CONTRADICTED" | "UNVERIFIED" | "INSUFFICIENT_EVIDENCE" | "OUTDATED_SOURCE" | "CONFLICTING_SOURCES";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  policyRule: string;
  explanation: string;
  suggestedCorrection: string;
  sourceDoc?: string;
  evidencePassage?: string;
}

interface CorrectionWorkspaceProps {
  apiBase: string;
  documentId?: string;
  initialText?: string;
  initialFindings?: Finding[];
  onRerunChecks?: (newText: string) => void;
}

export default function CorrectionWorkspace({
  apiBase,
  documentId = "DOC-DEMO-001",
  initialText = `Proofline provides 100% unbreachable cloud security with guaranteed zero latency. Our platform holds active ISO-27001 and SOC-2 Type II certifications under certificate ISO-2023-SEC (issued Jan 2023). Monthly pricing starts at $49/mo per seat.`,
  initialFindings = [
    {
      id: "FND-001",
      claim: "100% unbreachable cloud security with guaranteed zero latency",
      status: "CONTRADICTED",
      severity: "CRITICAL",
      policyRule: "RULE-002: Absolute Superlative Prohibition",
      explanation: "Superlatives '100% unbreachable' and 'zero latency' violate governance rules. No technical system can guarantee zero latency.",
      suggestedCorrection: "industry-leading cloud security with sub-millisecond median latency",
      sourceDoc: "SRC-001 (Proofline Master Architecture Spec)",
      evidencePassage: "Target architecture provides 99.9% uptime SLA with sub-millisecond p50 latency.",
    },
    {
      id: "FND-002",
      claim: "active ISO-27001 and SOC-2 Type II certifications under certificate ISO-2023-SEC (issued Jan 2023)",
      status: "OUTDATED_SOURCE",
      severity: "HIGH",
      policyRule: "RULE-004: Active Certification Verification",
      explanation: "Certificate ISO-2023-SEC expired on Dec 31, 2023. Current compliance requires active 2024/2025 audit certificate.",
      suggestedCorrection: "SOC-2 Type II compliance under current active audit cycle (2024-2025)",
      sourceDoc: "SRC-002 (Expired ISO Certificate)",
      evidencePassage: "ISO-2023-SEC: Validity Period: Jan 01, 2023 to Dec 31, 2023. Status: EXPIRED.",
    },
    {
      id: "FND-003",
      claim: "Monthly pricing starts at $49/mo per seat",
      status: "CONTRADICTED",
      severity: "MEDIUM",
      policyRule: "RULE-005: Verified Pricing & Currency Integrity",
      explanation: "Master pricing schedule lists enterprise tier at $99/mo per seat, not $49/mo.",
      suggestedCorrection: "Monthly pricing starts at $99/mo per seat as per Q4 schedule",
      sourceDoc: "SRC-003 (Enterprise Master Pricing)",
      evidencePassage: "Section 3.1: Standard seat license: $99 USD/month billed annually.",
    },
  ],
  onRerunChecks,
}: CorrectionWorkspaceProps) {
  const [originalText] = useState(initialText);
  const [draftText, setDraftText] = useState(initialText);
  const [findings, setFindings] = useState<Finding[]>(initialFindings);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(initialFindings[0] || null);
  const [comments, setComments] = useState<Array<{ user: string; text: string; time: string }>>([
    {
      user: "Auditor (Sarah K.)",
      text: "Flagged the expired ISO-2023 certificate and superlative latency claims before release approval.",
      time: "10:14 AM",
    },
  ]);
  const [commentInput, setCommentInput] = useState("");
  const [rerunning, setRerunning] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  const applySuggestion = (finding: Finding) => {
    if (!draftText.includes(finding.claim)) {
      // attempt partial replace
      alert("The original claim was modified or already replaced.");
      return;
    }
    const updated = draftText.replace(finding.claim, finding.suggestedCorrection);
    setDraftText(updated);
    setAppliedCount(appliedCount + 1);
    setFindings(findings.filter((f) => f.id !== finding.id));
    if (selectedFinding?.id === finding.id) {
      setSelectedFinding(null);
    }
  };

  const handleApplyAll = () => {
    let text = draftText;
    findings.forEach((f) => {
      if (text.includes(f.claim)) {
        text = text.replace(f.claim, f.suggestedCorrection);
      }
    });
    setDraftText(text);
    setAppliedCount(appliedCount + findings.length);
    setFindings([]);
    setSelectedFinding(null);
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    setComments([
      ...comments,
      {
        user: "Reviewer (You)",
        text: commentInput,
        time: "Just now",
      },
    ]);
    setCommentInput("");
  };

  const handleRerun = () => {
    setRerunning(true);
    setTimeout(() => {
      setRerunning(false);
      if (onRerunChecks) {
        onRerunChecks(draftText);
      }
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-glass border border-slate-700/60 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Document Correction & Review Workspace
                <span className="badge badge-cyan text-xs">Side-by-Side</span>
              </h2>
              <p className="text-sm text-slate-400">
                Interactive redlining and evidence reconciliation. Apply verified suggestions, request evidence, or trigger a re-audit.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {findings.length > 0 && (
            <button
              onClick={handleApplyAll}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" /> Accept All ({findings.length})
            </button>
          )}

          <button
            onClick={handleRerun}
            disabled={rerunning}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${rerunning ? "animate-spin" : ""}`} />
            {rerunning ? "Rerunning Audit..." : "Rerun Compliance Audit"}
          </button>
        </div>
      </div>

      {/* Split Review Workspace: Left Original, Right Corrected Draft */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Original Document & Highlighted Violations */}
        <div className="card-glass p-5 rounded-2xl border border-slate-700/60 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
              ORIGINAL REVISION (DOC-DEMO-001 v1.0)
            </span>
            <span className="badge badge-rose text-[10px] font-mono">
              {findings.length} Unresolved Issues
            </span>
          </div>

          {/* Render Original Text with Visual Highlights */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed min-h-[160px] whitespace-pre-wrap">
            {originalText}
          </div>

          {/* Outstanding Findings List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 block font-mono">
              FLAGGED FINDINGS & EVIDENCE PROVENANCE:
            </span>
            {findings.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                All compliance findings have been resolved with approved evidence!
              </div>
            ) : (
              findings.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFinding(f)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedFinding?.id === f.id
                      ? "bg-slate-800/90 border-cyan-500/60 shadow-lg shadow-cyan-950/30"
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-cyan-400 font-bold">{f.id}</span>
                    <span
                      className={`badge text-[10px] font-mono ${
                        f.severity === "CRITICAL"
                          ? "badge-rose"
                          : f.severity === "HIGH"
                          ? "badge-amber"
                          : "badge-blue"
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>

                  <p className="text-white font-medium line-clamp-1">{f.claim}</p>
                  <p className="text-slate-400 text-[11px] mt-1">{f.explanation}</p>

                  {f.evidencePassage && (
                    <div className="mt-2 p-2 rounded bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 font-mono">
                      <strong className="text-cyan-300">Evidence ({f.sourceDoc}):</strong>{" "}
                      {f.evidencePassage}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Policy: {f.policyRule}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        applySuggestion(f);
                      }}
                      className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-500/40 text-[10px] font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Apply Fix
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Proposed Corrected Draft & Reviewer Controls */}
        <div className="card-glass p-5 rounded-2xl border border-slate-700/60 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-300 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              CORRECTED DRAFT (v1.1-PROPOSED)
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {appliedCount} Corrections Applied
            </span>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1 font-mono">
              Editable Document Buffer:
            </label>
            <textarea
              rows={8}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
            />
          </div>

          {/* Change Diff Preview */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-300 font-mono">PROVENANCE & RECONCILIATION</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {draftText === originalText ? "Identical to Original" : "Modified Draft"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every applied correction is cryptographically bound to the cited source passage.
              Once satisfied, click <strong className="text-cyan-300">&quot;Rerun Compliance Audit&quot;</strong> to generate version-bound validation before release approval.
            </p>
          </div>

          {/* Review Comments Thread */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-bold text-white">Reviewer Audit Comments</span>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {comments.map((c, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5 font-mono">
                    <span className="font-semibold text-cyan-300">{c.user}</span>
                    <span>{c.time}</span>
                  </div>
                  <p className="text-slate-300">{c.text}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Add audit comment or approval note..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                className="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleAddComment}
                className="btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <Send className="w-3 h-3" /> Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
