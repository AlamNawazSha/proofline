"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  LayoutDashboard,
  Files,
  BookOpen,
  FlaskConical,
  Image as ImageIcon,
  BarChart3,
  Layers,
  History,
  Settings,
  Check,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  FileText,
  MessageSquare,
  Download,
  Send,
  RefreshCw,
  Lock,
  LogOut,
  X,
  Quote,
  Upload,
  Eye,
  GitCompareArrows,
  ExternalLink,
  Lightbulb,
  Shield,
  Info,
  Sparkles,
  MoreHorizontal,
  Clipboard,
  Trash2,
  Network,
  FileCode,
  Radio,
  Sliders,
  ShieldAlert,
  Key,
} from "lucide-react";
import EvidenceGraph from "./components/EvidenceGraph";
import RiskIntelligence from "./components/RiskIntelligence";
import VerificationPassport from "./components/VerificationPassport";
import AdversarialLab from "./components/AdversarialLab";
import PolicyStudio from "./components/PolicyStudio";
import AuditExplorer from "./components/AuditExplorer";
import IntegrationsAdmin from "./components/IntegrationsAdmin";
import ApprovalCenter from "./components/ApprovalCenter";
import CorrectionWorkspace from "./components/CorrectionWorkspace";

let SESSION: string | null = null;
try {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const urlSession = params.get("session");
    if (urlSession) {
      SESSION = urlSession;
      window.sessionStorage.setItem("proofline.session", urlSession);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      SESSION = window.sessionStorage.getItem("proofline.session");
    }
  }
} catch {
  SESSION = null; // storage can be blocked inside sandboxed previews
}

function rememberSession(token?: string | null) {
  if (!token) return;
  SESSION = token;
  try {
    window.sessionStorage.setItem("proofline.session", token);
  } catch {
    /* in-memory only */
  }
}

function forgetSession() {
  SESSION = null;
  try {
    window.sessionStorage.removeItem("proofline.session");
  } catch {
    /* ignore */
  }
}

async function api(path: string, method = "GET", data?: any) {
  const options: any = { method, credentials: "include" };
  const headers: any = {};
  if (SESSION) headers.Authorization = "Bearer " + SESSION;
  if (data instanceof FormData) options.body = data;
  else if (data !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify({ data });
  }
  if (Object.keys(headers).length) options.headers = headers;
  let r: Response;
  try {
    r = await fetch("/api" + path, options);
  } catch {
    const offline: any = new Error(
      "Cannot reach the Proofline API. The backend may have stopped — start it again, then retry.",
    );
    offline.code = "NETWORK";
    offline.status = 0;
    throw offline;
  }
  let result: any;
  try {
    result = await r.json();
  } catch {
    const isVercel =
      typeof window !== "undefined" &&
      window.location.hostname.includes("vercel.app");
    const detail =
      r.status === 404 && isVercel
        ? "Backend API is not connected. In your Vercel Dashboard, go to Settings > Environment Variables, add API_INTERNAL_URL pointing to your deployed backend, and redeploy."
        : `Unexpected response from the API (HTTP ${r.status}).`;
    result = { detail };
  }
  if (r.ok && result && result.sessionToken) rememberSession(result.sessionToken);
  if (!r.ok && r.status === 401) {
    forgetSession();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("proofline:session_expired"));
    }
  }
  if (!r.ok) {
    const message =
      typeof result.detail === "string"
        ? result.detail
        : "The request was rejected.";
    const hint =
      ACTION_HINT[result.code] ||
      (r.status === 429
        ? "wait a moment and retry"
        : r.status === 502 || r.status === 503 || r.status === 504
          ? "the backend may be waking up from cold start — retry in 30 seconds"
          : r.status >= 500
            ? "the backend reported an error — check the API log"
            : "");
    const err: any = new Error(hint ? message + " — " + hint : message);
    err.code = result.code || String(r.status);
    err.action = result.action;
    err.status = r.status;
    throw err;
  }
  return result;
}
const ACTION_HINT: any = {
  BACKEND_NOT_CONFIGURED: "configure API_INTERNAL_URL in Vercel Project Settings > Environment Variables and redeploy",
  RELOAD_LATEST: "reload and merge your changes",
  RERUN_REVIEW: "run the review again",
  SWITCH_ROLE: "switch to an authorised role (e.g. Reviewer)",
  ASK_MANAGER: "ask a workspace manager",
  WAIT_AND_RETRY: "wait a moment and retry",
  RETRY_LATER: "the server may be waking up, retry in about 30 seconds",
  GRANT_CONSENT: "tick the consent box first",
  REQUEST_REVIEW: "ask the creator to request review",
  REVIEW_REQUIRED: "complete a current review first",
  SELF_APPROVAL_BLOCKED: "choose a different reviewer",
  NOT_FOUND: "go back and reload",
  WORKSPACE_FORBIDDEN: "sign in to the correct workspace",
  NOT_CREATOR: "only the creator can edit this draft",
  APPROVAL_OUTDATED: "a new review and approval are needed",
};
const fmt = (x: string) =>
  new Date(x).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const BAD_SAMPLE =
  "Try our cheap plan! Guaranteed to save everyone 50%. Best in the world. Ask the Aurora Vault team.";
const BORDER_SAMPLE = "We saw 99.9% uptime last quarter.";
const approvedSample =
  "Discover our affordable plan. Pilot users saved up to 20% on annual plans. Results vary.";
const FINTECH_SAMPLE =
  "Try our cheap plan! Guaranteed to save 50% on all accounts. Unbeatable rates!";
const PRIVACY_SAMPLE =
  "Internal update: Do not share the Aurora Vault project credentials with anyone outside the team.";

function computeWordDiff(beforeText: string, afterText: string) {
  const bWords = (beforeText || "").split(/(\s+)/);
  const aWords = (afterText || "").split(/(\s+)/);
  const m = bWords.length;
  const n = aWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (bWords[i - 1] === aWords[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result: { type: "same" | "del" | "ins"; text: string }[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && bWords[i - 1] === aWords[j - 1]) {
      result.unshift({ type: "same", text: bWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "ins", text: aWords[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: "del", text: bWords[i - 1] });
      i--;
    }
  }
  return result;
}
const nav = [
  ["overview", "Overview", LayoutDashboard],
  ["sources", "Evidence Workspace", BookOpen],
  ["documents", "Document Reviews", Files],
  ["graph", "Evidence Graph", Network],
  ["studio", "Policy Studio", FileCode],
  ["approvals", "Approval Center", ShieldCheck],
  ["verification", "Verification Center", Key],
  ["risk", "Risk Intelligence", BarChart3],
  ["audit", "Audit Explorer", History],
  ["benchmark", "Adversarial Lab", ShieldAlert],
  ["integrations", "Integrations", Radio],
  ["admin", "Administration", Settings],
] as const;
function Badge({ children, tone = "neutral" }: any) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Button({
  children,
  onClick,
  variant = "",
  disabled = false,
  type = "button",
  title,
}: any) {
  return (
    <button
      type={type}
      title={title}
      className={"btn " + variant}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Empty({ icon: Icon = Files, title, body, action }: any) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
function Modal({ title, children, onClose, wide = false }: any) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <section
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)", background: "#f0f3f6", padding: "2px 6px", borderRadius: "4px" }}>
              Esc
            </span>
            <button
              className="icon-btn"
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={21} />
            </button>
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}
function Field({ label, children, hint }: any) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Status({ value }: any) {
  let tone = value?.includes("Approved")
    ? "green"
    : value?.includes("outdated") || value?.includes("changes")
      ? "amber"
      : value?.includes("Awaiting")
        ? "blue"
        : "neutral";
  return <Badge tone={tone}>{value}</Badge>;
}

export default function App() {
  const [config, setConfig] = useState<any>(null),
    [state, setState] = useState<any>(null),
    [tab, setTab] = useState("overview"),
    [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<any>(null),
    [modal, setModal] = useState<any>(null),
    [search, setSearch] = useState(""),
    [mobile, setMobile] = useState(false),
    [sessionExpired, setSessionExpired] = useState(false),
    [filter, setFilter] = useState("All");

  const openSecondSessionAsReviewer = async () => {
    try {
      const res = await api("/demo/reviewer-session", "POST");
      if (res?.sessionToken) {
        window.open(`/?session=${encodeURIComponent(res.sessionToken)}&role=reviewer`, "_blank");
      }
    } catch (e: any) {
      setNotice({ error: true, text: e.message || "Failed to create reviewer session." });
    }
  };

  const refresh = async () => {
    const data = await api("/state");
    setState(data);
    return data;
  };
  const recover = async () => {
    try {
      await api("/demo", "POST");
      const data = await api("/state");
      setState(data);
      setSessionExpired(false);
      setNotice({
        text: "A fresh workspace session was opened.",
      });
      return true;
    } catch {
      return false;
    }
  };
  useEffect(() => {
    const handleExpired = () => {
      setSessionExpired(true);
      setNotice({ error: true, text: "Your session expired. Click Restore Session to continue." });
    };
    window.addEventListener("proofline:session_expired", handleExpired);
    return () => window.removeEventListener("proofline:session_expired", handleExpired);
  }, []);
  useEffect(() => {
    api("/config")
      .then(setConfig)
      .catch(() =>
        setNotice({
          error: true,
          text: "The API is starting or unavailable. Refresh in a moment.",
        }),
      );
    refresh().catch(async (e: any) => {
      if (e.status === 401) {
        setSessionExpired(true);
        setNotice({
          error: true,
          text: "Your session expired. Click below to restore your workspace.",
        });
        return;
      }
      setNotice({ error: true, text: e.message });
    });
  }, []);
  useEffect(() => {
    if (!state) return;
    const active = state.jobs?.some((j: any) =>
      ["queued", "reviewing"].includes(j.status),
    );
    if (!active) return;
    const timer = setInterval(() => refresh().catch(() => {}), 1300);
    return () => clearInterval(timer);
  }, [state?.jobs]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(null), 7500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  const run = async (fn: () => Promise<any>, message?: string) => {
    setBusy(true);
    try {
      const result = await fn();
      await refresh();
      if (message) setNotice({ text: message });
      return result;
    } catch (e: any) {
      setNotice({ error: true, text: e.message });
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const safe = async (fn: any, message?: string) => {
    try {
      return await run(fn, message);
    } catch {}
  };
  const openDoc = (id: string) => {
    setSelected(id);
    setTab("editor");
    setMobile(false);
  };
  const start = () =>
    safe(async () => {
      await api("/demo", "POST");
      setTab("overview");
    }, "Your workspace is ready.");
  const download = async (path: string, name: string) => {
    try {
      const r = await fetch("/api" + path);
      if (!r.ok) {
        const er = await r.json();
        throw new Error(er.detail);
      }
      const blob = await r.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
      await refresh();
      setNotice({ text: "Current-version export created and recorded." });
    } catch (e: any) {
      setNotice({ error: true, text: e.message });
    }
  };
  const createModal = () => setModal({ type: "new" });
  if (!state)
    return (
      <div className="landing">
        {sessionExpired && (
          <div
            role="alert"
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <AlertTriangle size={18} color="#b45309" />
              <div>
                <strong style={{ color: "#92400e", fontSize: "13px" }}>Session Expired</strong>
                <p style={{ margin: "2px 0 0", color: "#b45309", fontSize: "12px" }}>
                  Your session expired. Restore your workspace or sign in below.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant="primary"
                onClick={async () => {
                  setSessionExpired(false);
                  await recover();
                }}
              >
                Restore Session
              </Button>
              <Button
                onClick={() => {
                  setSessionExpired(false);
                  setModal({ type: "login" });
                }}
              >
                Sign In
              </Button>
            </div>
          </div>
        )}
        <header className="landing-nav">
          <Brand />
          <span className="landing-small">
            Brand governance, before publication.
          </span>
          <button className="btn" onClick={() => setModal({ type: "login" })}>
            Sign in or create account <ArrowUpRight size={15} />
          </button>
        </header>
        <main className="landing-main">
          <div className="eyebrow">
            <span /> EVIDENCE BEFORE APPROVAL
          </div>
          <h1>
            Confident content.
            <br />
            <span>Nothing left to guess.</span>
          </h1>
          <p className="landing-copy">
            One place to check your words against approved knowledge, explain
            every issue, and record who approved the exact version.
          </p>
          <div className="landing-actions">
            <Button variant="primary large" onClick={start} disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <ArrowRight size={18} />
              )}{" "}
              Get Started with Proofline
            </Button>
            <span>
              <Lock size={14} /> Instant workspace access. No credit card required.
            </span>
          </div>
          <div className="landing-note">
            Enterprise Brand Governance &amp; Automated Compliance Verification
          </div>
          <div className="landing-flow">
            <div>
              <BookOpen />
              <strong>Approved sources</strong>
              <span>Facts, terms &amp; brand rules</span>
            </div>
            <ChevronRight />
            <div>
              <Search />
              <strong>Explainable review</strong>
              <span>Evidence, not a mystery score</span>
            </div>
            <ChevronRight />
            <div>
              <ShieldCheck />
              <strong>Human decision</strong>
              <span>One exact version. One receipt.</span>
            </div>
          </div>
          <small className="landing-caption">
            Deterministic compliance checks, cryptographic release receipts, and exact-version approval governance.
          </small>
        </main>
        <footer className="landing-foot">
          <Brand small />
          <span>Built for thoughtful teams. Powered by human judgement.</span>
          <span>FutureStack 2026 · syedsuhailahamed.m26</span>
        </footer>
        {notice && <Toast notice={notice} close={() => setNotice(null)} />}{" "}
        {modal?.type === "login" && (
          <Login
            config={config}
            close={() => setModal(null)}
            onDone={async () => {
              const data = await api("/state");
              setState(data);
              setModal(null);
              setNotice({
                text:
                  data.mode === "supabase"
                    ? "Signed in. Your workspace is stored in Supabase."
                    : "Signed in with a local development account.",
              });
            }}
          />
        )}
      </div>
    );
  const doc = state.documents.find((d: any) => d.id === selected);
  const manager = state.actor.role === "manager";
  return (
    <div className="shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <Brand />
        <div className="workspace-switch" title="Active governance workspace">
          <span className="workspace-icon">N</span>
          <div>
            <strong>{state.name}</strong>
            <small>
              {state.mode === "supabase"
                ? "Enterprise Cloud"
                : "Active Workspace"}
            </small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={
                "nav-item " +
                (tab === id || (tab === "editor" && id === "documents")
                  ? "active"
                  : "")
              }
              onClick={() => {
                setTab(id);
                setMobile(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "documents" && <em>{state.documents.length}</em>}
              {id === "benchmark" && <span className="tiny-new">LAB</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="trust-note">
            <ShieldCheck size={19} />
            <strong>Human control, always.</strong>
            <p>AI can suggest. Only an authorised reviewer can approve.</p>
          </div>
          <button
            className={"nav-item " + (tab === "settings" ? "active" : "")}
            onClick={() => setTab("settings")}
          >
            <Settings size={18} /> Connections & settings
          </button>
          <button
            className="nav-item"
            onClick={() => {
              api("/logout", "POST").then(() => {
                setState(null);
                setSelected(null);
              });
            }}
          >
            <LogOut size={18} /> Leave workspace
          </button>
          <small className="sidebar-credit">
            {state.mode === "supabase"
              ? "SUPABASE WORKSPACE · ENTERPRISE"
              : state.mode === "local"
                ? "LOCAL ACCOUNTS STORE"
                : "PROOFLINE GOVERNANCE · LIVE"}
          </small>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            onClick={() => setMobile(!mobile)}
            aria-label="Open navigation"
          >
            <LayoutDashboard size={20} />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />{" "}
            <strong>
              {tab === "editor"
                ? "Content review"
                : tab === "settings"
                  ? "Connections & settings"
                  : nav.find((n) => n[0] === tab)?.[1]}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="connection-pill">
              <span />
              {state.mode === "supabase" ? "Cloud Connected" : "Live Authority"}
            </span>
            <div className="actor">
              <span className="avatar">
                {state.actor.name
                  .split(" ")
                  .map((x: string) => x[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <strong>{state.actor.name}</strong>
                {state.mode === "demo" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <select
                      aria-label="Active role"
                      value={state.actor.role}
                      onChange={(ev) =>
                        safe(
                          () =>
                            api("/persona", "POST", { role: ev.target.value }),
                          "Role changed to " + ev.target.value + ".",
                        )
                      }
                    >
                      <option value="creator">Creator (Author)</option>
                      <option value="reviewer">Reviewer (Auditor)</option>
                      <option value="manager">Manager (Admin)</option>
                      <option value="auditor">Auditor (Read-Only)</option>
                    </select>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        fontSize: "11px",
                        padding: "3px 8px",
                        background: "rgba(6, 182, 212, 0.12)",
                        border: "1px solid rgba(6, 182, 212, 0.35)",
                        color: "#22d3ee",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      onClick={() =>
                        safe(async () => {
                          await api("/demo/reset", "POST");
                          await refresh();
                        }, "Demo workspace reset to 9 scenarios (expired cert, contradictory sources, pricing rules, prompt injection).")
                      }
                      title="Reset workspace with all 9 hackathon demo test scenarios"
                    >
                      <RefreshCw size={11} /> Reset Demo
                    </button>
                  </div>
                ) : (
                  <small>{state.actor.role}</small>
                )}
              </div>
            </div>
          </div>
        </header>
        {sessionExpired && (
          <div
            role="alert"
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              padding: "14px 24px",
              margin: "12px 35px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <AlertTriangle size={18} color="#b45309" />
              <div>
                <strong style={{ color: "#92400e", fontSize: "13px" }}>Session Expired</strong>
                <p style={{ margin: "2px 0 0", color: "#b45309", fontSize: "12px" }}>
                  Your session expired. Restore the workspace or sign in again to continue.
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant="primary"
                onClick={async () => {
                  setSessionExpired(false);
                  await recover();
                }}
              >
                Restore Session
              </Button>
              <Button
                onClick={() => {
                  setSessionExpired(false);
                  setModal({ type: "login" });
                }}
              >
                Sign In
              </Button>
            </div>
          </div>
        )}
        {state.mode === "demo" && (
          <StepBar
            state={state}
            open={openDoc}
            safe={safe}
            onOpenReviewer={openSecondSessionAsReviewer}
          />
        )}
        <main className="content">
          {tab === "overview" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR GOVERNANCE WORKSPACE</div>
                  <h1>A clear path to confident content.</h1>
                  <p>Know what needs attention. Keep the evidence close.</p>
                </div>
                <Button variant="primary" onClick={createModal}>
                  <Plus size={17} /> New content
                </Button>
              </div>
              <div className="stats-grid">
                <Stat
                  label="Content in workspace"
                  value={state.documents.length}
                  icon={Files}
                  note="Persisted drafts and revisions"
                />
                <Stat
                  label="Awaiting a reviewer"
                  value={
                    state.documents.filter(
                      (d: any) => d.status === "Awaiting review",
                    ).length
                  }
                  icon={Clock}
                  note="Human decisions, not auto-approval"
                />
                <Stat
                  label="Current approved content"
                  value={
                    state.documents.filter((d: any) => d.readiness.eligible)
                      .length
                  }
                  icon={ShieldCheck}
                  note="Eligible for exact-version export"
                />
                <Stat
                  label="Active source pack"
                  value={"v" + state.sourceVersion}
                  icon={BookOpen}
                  note={
                    state.sources.filter((s: any) => s.active).length +
                    " confirmed source(s)"
                  }
                />
              </div>

              {/* Proofline 2.0 Autonomous Governance Intelligence Deck */}
              <div className="innovations-deck">
                <div className="innovations-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={16} style={{ color: "var(--teal)" }} />
                    <strong className="innovations-label">
                      PROOFLINE 2.0 GOVERNANCE INNOVATIONS
                    </strong>
                    <span className="badge blue" style={{ fontSize: "10px", padding: "2px 7px" }}>ENTERPRISE SUITE</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Verifiable AI Compliance &amp; Proof Pipeline
                  </span>
                </div>

                <div className="innovations-grid">
                  <div
                    className="innovation-card"
                    onClick={() => setTab("graph")}
                  >
                    <div className="innovation-icon-box" style={{ background: "#e0f2fe", color: "#0284c7" }}>
                      <Network size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                        <strong className="innovation-title">Evidence Graph</strong>
                        <ArrowRight size={13} className="innovation-arrow" />
                      </div>
                      <span className="innovation-desc">Trace claims to sources &amp; cascade impact</span>
                    </div>
                  </div>

                  <div
                    className="innovation-card"
                    onClick={() => setTab("verification")}
                  >
                    <div className="innovation-icon-box" style={{ background: "#ecfdf5", color: "#059669" }}>
                      <Key size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                        <strong className="innovation-title">Verification Center</strong>
                        <ArrowRight size={13} className="innovation-arrow" />
                      </div>
                      <span className="innovation-desc">Ed25519 &amp; 1-word tamper detection demo</span>
                    </div>
                  </div>

                  <div
                    className="innovation-card"
                    onClick={() => setTab("studio")}
                  >
                    <div className="innovation-icon-box" style={{ background: "#faf5ff", color: "#9333ea" }}>
                      <FileCode size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                        <strong className="innovation-title">Policy Studio</strong>
                        <ArrowRight size={13} className="innovation-arrow" />
                      </div>
                      <span className="innovation-desc">Deterministic rules &amp; NL synthesizer</span>
                    </div>
                  </div>

                  <div
                    className="innovation-card"
                    onClick={() => setTab("risk")}
                  >
                    <div className="innovation-icon-box" style={{ background: "#fffbeb", color: "#d97706" }}>
                      <BarChart3 size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                        <strong className="innovation-title">Risk Intelligence</strong>
                        <ArrowRight size={13} className="innovation-arrow" />
                      </div>
                      <span className="innovation-desc">5x5 heat map &amp; source expiration monitor</span>
                    </div>
                  </div>

                  <div
                    className="innovation-card"
                    onClick={() => setTab("benchmark")}
                  >
                    <div className="innovation-icon-box" style={{ background: "#fff1f2", color: "#e11d48" }}>
                      <ShieldAlert size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                        <strong className="innovation-title">Adversarial Lab</strong>
                        <ArrowRight size={13} className="innovation-arrow" />
                      </div>
                      <span className="innovation-desc">12-test ground truth &amp; prompt injection test</span>
                    </div>
                  </div>

                  <div
                    className="innovation-card"
                    onClick={() => setTab("audit")}
                  >
                    <div className="innovation-icon-box" style={{ background: "#eff6ff", color: "#2563eb" }}>
                      <History size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                        <strong className="innovation-title">Audit Explorer</strong>
                        <ArrowRight size={13} className="innovation-arrow" />
                      </div>
                      <span className="innovation-desc">Append-only SHA-256 chain verification</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overview-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Pick up where you left off</h2>
                      <p>Your content, evidence and next decisions.</p>
                    </div>
                    <button
                      className="text-btn"
                      onClick={() => setTab("documents")}
                    >
                      View library <ArrowRight size={15} />
                    </button>
                  </div>
                  <DocList docs={state.documents.slice(0, 5)} open={openDoc} />
                </section>
                <section className="panel journey">
                  <div className="panel-heading">
                    <h2>Your first approved release</h2>
                    <Badge tone="blue">START HERE</Badge>
                  </div>
                  {[
                    {
                      title: "Review the sample content",
                      body: "Open the seeded draft and run real rule-based checks.",
                      done: state.documents.some((d: any) => d.review),
                    },
                    {
                      title: "Correct, then review again",
                      body: "Accept a suggestion or edit the draft. Save a new revision.",
                      done: state.documents.some((d: any) => d.revision > 1),
                    },
                    {
                      title: "Ask a different reviewer",
                      body: "Submit for approval, verify evidence, and record human decision.",
                      done: state.documents.some(
                        (d: any) => d.submitted || d.decision,
                      ),
                    },
                    {
                      title: "Export the approved version",
                      body: "Then change it: the previous approval must stop working.",
                      done: state.receipts.length > 0,
                    },
                  ].map((x, i) => (
                    <div className="journey-step" key={x.title}>
                      <span className={x.done ? "done" : ""}>
                        {x.done ? <Check size={14} /> : i + 1}
                      </span>
                      <div>
                        <strong>{x.title}</strong>
                        <p>{x.body}</p>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="soft"
                    onClick={() =>
                      state.documents[0]
                        ? openDoc(state.documents[0].id)
                        : createModal()
                    }
                  >
                    Open content <ArrowRight size={16} />
                  </Button>
                </section>
              </div>
              <div className="bottom-callout">
                <Shield size={23} />
                <div>
                  <strong>
                    Approval follows the content—not the other way around.
                  </strong>
                  <p>
                    Edits to content, context or active sources require a fresh
                    review. Existing downloads stay historical.
                  </p>
                </div>
                <Badge tone="green">SERVER-ENFORCED</Badge>
              </div>
            </>
          )}
          {tab === "documents" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">CONTENT LIBRARY</div>
                  <h1>Every draft has a story.</h1>
                  <p>
                    Keep revisions, evidence and decisions in the same place.
                  </p>
                </div>
                <Button variant="primary" onClick={createModal}>
                  <Plus size={17} /> New content
                </Button>
              </div>
              <section className="panel">
                <div className="filterbar">
                  <div className="searchbox">
                    <Search size={17} />
                    <input
                      placeholder="Find content by title…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Badge>{state.documents.length} documents</Badge>
                </div>
                <div className="filter-chips">
                  {[
                    "All",
                    "Needs attention",
                    "Awaiting review",
                    "Approved",
                    "Drafts",
                  ].map((f) => (
                    <button
                      key={f}
                      className={filter === f ? "active" : ""}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                      {f === "All" ? (
                        ""
                      ) : f === "Drafts" ? (
                        <span>
                          {
                            state.documents.filter((d: any) =>
                              ["Draft", "Needs changes"].includes(d.status),
                            ).length
                          }
                        </span>
                      ) : f === "Approved" ? (
                        <span>
                          {
                            state.documents.filter(
                              (d: any) => d.readiness.eligible,
                            ).length
                          }
                        </span>
                      ) : f === "Awaiting review" ? (
                        <span>
                          {
                            state.documents.filter(
                              (d: any) => d.status === "Awaiting review",
                            ).length
                          }
                        </span>
                      ) : (
                        <span>
                          {
                            state.documents.filter(
                              (d: any) =>
                                !d.readiness.eligible &&
                                ![
                                  "Awaiting review",
                                  "Draft",
                                  "Approved",
                                ].includes(d.status),
                            ).length
                          }
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <DocList
                  docs={state.documents
                    .filter((d: any) =>
                      d.title.toLowerCase().includes(search.toLowerCase()),
                    )
                    .filter((d: any) =>
                      filter === "All"
                        ? true
                        : filter === "Approved"
                          ? d.readiness.eligible
                          : filter === "Awaiting review"
                            ? d.status === "Awaiting review"
                            : filter === "Drafts"
                              ? ["Draft", "Needs changes"].includes(d.status)
                              : !d.readiness.eligible &&
                                ![
                                  "Awaiting review",
                                  "Draft",
                                  "Approved",
                                ].includes(d.status),
                    )}
                  open={openDoc}
                />
              </section>
            </>
          )}
          {tab === "editor" && doc && (
            <Editor
              key={doc.id}
              doc={doc}
              state={state}
              config={config}
              busy={busy}
              safe={safe}
              api={api}
              refresh={refresh}
              download={download}
              notify={setNotice}
              back={() => setTab("documents")}
            />
          )}
          {tab === "sources" && (
            <Sources state={state} safe={safe} busy={busy} notify={setNotice} />
          )}
          {tab === "lab" && (
            <Laboratory state={state} safe={safe} notify={setNotice} />
          )}
          {tab === "assets" && (
            <Visuals state={state} safe={safe} notify={setNotice} />
          )}
          {tab === "insights" && <Insights state={state} open={openDoc} />}
          {tab === "campaigns" && (
            <Campaigns
              state={state}
              safe={safe}
              download={download}
              open={openDoc}
            />
          )}
          {tab === "activity" && (
            <>
              <PageTitle
                eyebrow="ACTIVITY LOG"
                title="Decisions leave a trail."
                body="Actual workspace events. Application records—not an immutable or signed audit ledger."
              />
              <section className="panel timeline">
                {state.events.length ? (
                  state.events.map((ev: any) => (
                    <div className="event" key={ev.id}>
                      <span className="event-dot" />
                      <div>
                        <strong>{ev.action}</strong>
                        <p>{ev.detail}</p>
                        <small>
                          {ev.actor} · {fmt(ev.at)}
                        </small>
                      </div>
                      {ev.documentId && (
                        <button
                          className="icon-btn"
                          onClick={() => openDoc(ev.documentId)}
                          aria-label="Open document"
                        >
                          <ArrowUpRight size={17} />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={History}
                    title="The next action starts your trail"
                    body="Create or review content to record the first event."
                  />
                )}
              </section>
            </>
          )}
          {tab === "settings" && (
            <SettingsView
              config={config}
              state={state}
              safe={safe}
              start={start}
            />
          )}
          {tab === "graph" && (
            <EvidenceGraph api={api} onSelectDocument={openDoc} />
          )}
          {tab === "studio" && <PolicyStudio apiBase="" />}
          {tab === "verification" && (
            <VerificationPassport
              api={api}
              receipts={state.receipts || []}
              documents={state.documents || []}
            />
          )}
          {tab === "risk" && (
            <RiskIntelligence
              api={api}
              state={state}
              onNavigate={(t: string) => setTab(t)}
            />
          )}
          {tab === "audit" && (
            <AuditExplorer apiBase="" initialEvents={state.events} />
          )}
          {tab === "benchmark" && <AdversarialLab apiBase="" />}
          {tab === "integrations" && <IntegrationsAdmin apiBase="" />}
          {tab === "admin" && <IntegrationsAdmin apiBase="" />}
          {tab === "approvals" && (
            <ApprovalCenter
              state={state}
              safe={safe}
              api={api}
              refresh={refresh}
              notify={setNotice}
              openDoc={openDoc}
              onVerifyReceipt={() => setTab("verification")}
            />
          )}
          <footer className="content-footer">
            <span>
              <ShieldCheck size={13} /> Evidence first. Human decision. Exact
              version.
            </span>
            <span>Proofline · syedsuhailahamed.m26</span>
          </footer>
        </main>
      </div>
      {notice && <Toast notice={notice} close={() => setNotice(null)} />}
      {modal?.type === "new" && (
        <NewDocument
          close={() => setModal(null)}
          safe={safe}
          created={(id: string) => {
            setModal(null);
            openDoc(id);
          }}
        />
      )}
    </div>
  );
}
function StepBar({ state, open, safe, onOpenReviewer }: any) {
  const docs = state.documents || [];
  const steps = [
    {
      label: "Run a review",
      expected: "Flags guaranteed savings and terminology issues with exact source quotes.",
      done: docs.some((d: any) => d.review),
      hint: "Open the draft and press Run review.",
      act: () => docs[0] && open(docs[0].id),
    },
    {
      label: "Correct and recheck",
      expected: "Generates revision 2 with zero unresolved findings.",
      done: docs.some((d: any) => d.revision > 1),
      hint: "Fix a finding, save, and review the new revision.",
      act: () => docs[0] && open(docs[0].id),
    },
    {
      label: "Request approval",
      expected: "Submits draft to review inbox; creator self-approval is blocked with 403.",
      done: docs.some((d: any) => d.submitted || d.decision),
      hint: "Press Request approval on the reviewed revision.",
      act: () => docs[0] && open(docs[0].id),
    },
    {
      label: "Approve as a different person",
      expected: "Reviewer verifies coverage and signs exact fingerprint (200).",
      done: docs.some((d: any) => d.decision?.outcome === "approved"),
      hint:
        state.actor.role === "reviewer"
          ? "Tick the human-review box and approve the exact version."
          : "Open an independent reviewer session in a separate tab to approve without playing both roles.",
      act: () =>
        state.actor.role === "reviewer"
          ? docs[0] && open(docs[0].id)
          : onOpenReviewer
            ? onOpenReviewer()
            : safe(
                () => api("/persona", "POST", { role: "reviewer" }),
                "Role changed to Reviewer.",
              ),
    },
    {
      label: "Export the receipt",
      expected: "Returns 200 receipt bound to revision and active source version.",
      done: (state.receipts || []).length > 0,
      hint: "Download the report or JSON receipt.",
      act: () => docs[0] && open(docs[0].id),
    },
    {
      label: "Prove the approval goes stale",
      expected: "Post-approval edit revokes authorisation; export blocked with 409.",
      done: docs.some((d: any) => d.status === "Approval outdated"),
      hint: "Edit the approved content: export must now be blocked.",
      act: () => docs[0] && open(docs[0].id),
    },
  ];
  const idx = Math.max(
    0,
    steps.findIndex((x: any) => !x.done),
  );
  const current = steps[idx];
  return (
    <div className="stepbar">
      <div className="stepbar-dots">
        {steps.map((x: any, i: number) => (
          <span
            key={x.label}
            className={x.done ? "done" : i === idx ? "current" : ""}
            title={x.label}
          >
            {x.done ? <Check size={11} /> : i + 1}
          </span>
        ))}
      </div>
      <div className="stepbar-text">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <strong>
            Step {idx + 1} of {steps.length}: {current.label}
          </strong>
          <span
            className={"badge " + (current.done ? "green" : "blue")}
            style={{ fontSize: "11px", padding: "1px 6px" }}
          >
            {current.done ? "Completed" : "In progress"}
          </span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--teal)", marginTop: "2px" }}>
          <strong>Expected:</strong> {current.expected}
        </div>
        <span style={{ fontSize: "12px", color: "var(--sub)" }}>
          {current.done
            ? "All six governance steps complete. Compliance invariants verified."
            : current.hint}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {idx === 3 && state.actor.role !== "reviewer" && onOpenReviewer && (
          <button
            type="button"
            className="btn"
            onClick={onOpenReviewer}
            title="Open an independent reviewer session"
            style={{
              fontSize: "11px",
              padding: "4px 9px",
              minHeight: "30px",
              background: "#f0fdf4",
              borderColor: "#86efac",
              color: "#166534",
            }}
          >
            <ExternalLink size={13} /> Open Reviewer tab
          </button>
        )}
        <button className="stepbar-btn pulse" onClick={current.act}>
          {current.done ? "Review journey" : "Take me there"}{" "}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

function Brand({ small = false }: any) {
  return (
    <div className={"brand " + (small ? "small" : "")}>
      <span>
        <ShieldCheck size={small ? 19 : 24} />
      </span>
      <strong>
        proofline<span className="brand-dot">.</span>
      </strong>
    </div>
  );
}
function Toast({ notice, close }: any) {
  return (
    <div
      className={"toast " + (notice.error ? "error" : "")}
      role={notice.error ? "alert" : "status"}
      aria-live="polite"
    >
      {notice.error ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
      <span>{notice.text}</span>
      <button onClick={close} aria-label="Dismiss">
        <X size={17} />
      </button>
    </div>
  );
}
function PageTitle({ eyebrow, title, body, action }: any) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      {action}
    </div>
  );
}
function Stat({ label, value, icon: Icon, note }: any) {
  return (
    <div className="stat">
      <div>
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function DocList({ docs, open }: any) {
  return docs.length ? (
    <div className="doc-list">
      <div className="doc-table-head">
        <span>CONTENT</span>
        <span>STATUS</span>
        <span>LAST UPDATED</span>
        <span />
      </div>
      {docs.map((d: any) => (
        <button className="doc-row" key={d.id} onClick={() => open(d.id)}>
          <div className="doc-name">
            <span className="doc-icon">
              <FileText size={20} />
            </span>
            <div>
              <strong>{d.title}</strong>
              <small>
                {d.context?.channel} <i /> Revision {d.revision} <i />{" "}
                {d.creatorName}
              </small>
            </div>
          </div>
          <Status value={d.status} />
          <small>{fmt(d.updatedAt)}</small>
          <ArrowUpRight size={17} />
        </button>
      ))}
    </div>
  ) : (
    <Empty
      title="No content yet"
      body="Create a draft to start checking against approved brand knowledge."
    />
  );
}
function Login({ config, close, onDone }: any) {
  const hosted = !!config?.supabaseConfigured;
  const [mode, setMode] = useState(hosted ? "signup" : "local-signup");
  const [email, se] = useState(""),
    [password, sp] = useState(""),
    [name, sn] = useState(""),
    [busy, sb] = useState(false),
    [error, setError] = useState("");
  const local = mode.startsWith("local");
  const localSignin = mode === "local-login";
  const isLocal = local || !hosted;
  const isLocalSignin = isLocal && (localSignin || mode === "login");
  const isSignupMode = mode === "signup" || mode === "local-signup";
  const submit = async (e: any) => {
    e.preventDefault();
    setError("");
    sb(true);
    try {
      const path = isLocal
        ? isLocalSignin
          ? "/account/login"
          : "/account/register"
        : isSignupMode
          ? "/account/signup"
          : "/login";
      const result = await api(path, "POST", {
        email,
        password,
        name: name || undefined,
      });
      rememberSession(result?.sessionToken);
      if (typeof onDone === "function") await onDone();
      else location.reload();
    } catch (err: any) {
      const message = String(err.message || "");
      const exists =
        err.status === 409 || /already exists|already registered/i.test(message);
      if (exists && isSignupMode) {
        // The account is already there — try the matching sign-in path once
        // with the credentials just typed instead of making the user hunt tabs.
        try {
          await api(isLocal ? "/account/login" : "/login", "POST", {
            email,
            password,
          });
          if (typeof onDone === "function") await onDone();
          else location.reload();
          return;
        } catch {
          setMode(isLocal ? "local-login" : "login");
          setError(
            "That email already has an account. Enter its password and press Sign in.",
          );
          return;
        }
      }
      setError(message);
    } finally {
      sb(false);
    }
  };
  const tabs = hosted
    ? [
        ["signup", "Create account"],
        ["login", "Sign in"],
        [local ? mode : "local-signup", localSignin ? "Local dev sign in" : "Local dev account"],
      ]
    : [
        ["local-signup", "Create account"],
        ["local-login", "Sign in"],
      ];
  return (
    <Modal title="Sign in or create an account" onClose={close}>
      <div className="auth-tabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={mode === id ? "active" : ""}
            onClick={() => {
              setMode(id);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {hosted ? (
        <p className="form-note">
          {local
            ? "Local development accounts are stored on this server with PBKDF2-hashed passwords. Use them when you do not want to touch the hosted database."
            : "Hosted accounts use Supabase Auth and persist across restarts. Your workspace data is stored in Supabase too."}
        </p>
      ) : (
        <div className="callout amber">
          <AlertTriangle size={18} /> Local development accounts are stored on this server with PBKDF2 password hashing. You can also proceed with instant access.
        </div>
      )}
      <form onSubmit={submit}>
        {isSignupMode && (
          <Field label="Your name">
            <input
              autoFocus
              required
              autoComplete="name"
              value={name}
              onChange={(e) => sn(e.target.value)}
            />
          </Field>
        )}
        <Field label="Email">
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => se(e.target.value)}
          />
        </Field>
        <Field
          label="Password"
          hint="At least 8 characters. Never reuse a password you use elsewhere."
        >
          <input
            type="password"
            autoComplete={isSignupMode ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => sp(e.target.value)}
          />
        </Field>
        {error && (
          <div className="callout red">
            <AlertTriangle size={18} /> {error}
          </div>
        )}
        <div className="form-actions">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
            {isSignupMode ? "Create account" : "Sign in"}{" "}
            <ArrowRight size={16} />
          </Button>
          <button type="button" className="text-btn" onClick={close}>
            Continue with Instant Access
          </button>
        </div>
        <p className="form-note">
          Creating an account makes you the manager of a new workspace containing
          a clearly labelled example source pack. Replace it with your own
          approved guidance before real use. Add colleagues by email under
          Connections &amp; settings once they have created an account.
        </p>
      </form>
    </Modal>
  );
}
function NewDocument({ close, safe, created }: any) {
  const [title, st] = useState(""),
    [text, sx] = useState(""),
    [channel, sc] = useState("website"),
    [audience, sa] = useState("public"),
    [purpose, sp] = useState("Product launch"),
    [loading, sl] = useState(false);
  return (
    <Modal title="Start a new content review" onClose={close} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          safe(async () => {
            const r = await api("/documents", "POST", {
              title,
              text,
              context: { channel, audience, purpose },
            });
            created(r.id);
          }, "Draft created.");
        }}
      >
        <Field label="Content title">
          <input
            autoFocus
            required
            placeholder="e.g. Annual plan launch email"
            value={title}
            onChange={(e) => st(e.target.value)}
          />
        </Field>
        <div className="three-cols">
          <Field label="Channel">
            <select value={channel} onChange={(e) => sc(e.target.value)}>
              <option>website</option>
              <option>email</option>
              <option>social</option>
              <option>support</option>
              <option>internal</option>
            </select>
          </Field>
          <Field label="Audience">
            <input value={audience} onChange={(e) => sa(e.target.value)} />
          </Field>
          <Field label="Purpose">
            <input value={purpose} onChange={(e) => sp(e.target.value)} />
          </Field>
        </div>
        <div className="field">
          <span>Draft text</span>
          <textarea
            rows={9}
            value={text}
            onChange={(e) => sx(e.target.value)}
            placeholder="Paste text, or import a selectable-text PDF below…"
            required
          />
          <small>English · 3,000 words · no silent truncation</small>
        </div>
        <div className="sample-row">
          <span>Load a sample:</span>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              sx(BAD_SAMPLE);
              st("Sample — problems to find");
            }}
          >
            Problematic
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              sx(BORDER_SAMPLE);
              st("Sample — borderline");
            }}
          >
            Borderline
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              sx(approvedSample);
              st("Sample — clean");
            }}
          >
            Clean
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              sx(FINTECH_SAMPLE);
              st("Sample — Fintech claim");
            }}
          >
            Fintech claim
          </button>
          <button
            type="button"
            className="text-btn"
            onClick={() => {
              sx(PRIVACY_SAMPLE);
              st("Sample — Confidentiality leak");
            }}
          >
            Confidential
          </button>
        </div>
        <div className="form-actions">
          <label className="btn">
            <Upload size={16} />
            {loading ? "Reading document…" : "Import PDF / text"}
            <input
              type="file"
              hidden
              accept=".pdf,.txt,.md"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                sl(true);
                const form = new FormData();
                form.append("file", f);
                try {
                  const r = await api("/extract", "POST", form);
                  sx(r.text);
                  if (!title) st(f.name);
                } catch (er: any) {
                  alert(er.message);
                } finally {
                  sl(false);
                }
              }}
            />
          </label>
          <Button type="submit" variant="primary">
            <Plus size={16} /> Create draft
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Editor({
  doc,
  state,
  config,
  busy,
  safe,
  refresh,
  download,
  notify,
  back,
}: any) {
  const [text, st] = useState(doc.text),
    [title, sTitle] = useState(doc.title),
    [context, sc] = useState(doc.context),
    [rightTab, srt] = useState("findings"),
    [useAI, sai] = useState(false),
    [consent, sConsent] = useState(false),
    [suggestion, ss] = useState<any>(null),
    [comment, sComment] = useState(""),
    [contest, sContest] = useState<any>(null),
    [reason, sReason] = useState(""),
    [feedback, sFeedback] = useState<any>(null),
    [manual, sm] = useState(false),
    [decisionReason, sdr] = useState("");
  useEffect(() => {
    st(doc.text);
    sTitle(doc.title);
    sc(doc.context);
  }, [doc.revision]);
  const isOwner = doc.creatorId === state.actor.id,
    canReview = ["reviewer", "manager"].includes(state.actor.role) && !isOwner,
    dirty =
      text !== doc.text ||
      title !== doc.title ||
      JSON.stringify(context) !== JSON.stringify(doc.context);
  const active = ["queued", "reviewing"].includes(doc.review?.status);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const rewrite = (f: any) => {
    if (!isOwner)
      return notify({
        error: true,
        text: "Only the creator can edit this draft.",
      });
    if (dirty)
      return notify({
        error: true,
        text: "Save or discard your edits before selecting a flagged passage.",
      });
    const el = draftRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(f.start, Math.max(f.end, f.start));
    notify({
      text: "The flagged words are selected in the draft. Rewrite them in your own voice, then save the revision.",
    });
  };
  const save = () =>
    safe(
      () =>
        api("/documents/" + doc.id, "PUT", {
          text,
          title,
          context,
          expectedRevision: doc.revision,
        }),
      "New revision saved. Previous approval cannot authorise this version.",
    );
  const queue = () =>
    safe(
      () =>
        api("/documents/" + doc.id + "/review", "POST", {
          useAI: useAI && Boolean(config?.aiConfigured),
          consent,
        }),
      "Review queued. Processing status is separate from approval.",
    );
  const openSuggestion = (f: any) =>
    safe(async () => {
      const r = await api("/documents/" + doc.id + "/suggestion", "POST", {
        findingId: f.id,
        expectedRevision: doc.revision,
      });
      ss(r);
    });
  const highlights = () => {
    let cursor = 0;
    const result: any[] = [];
    const ranges = doc.findings
      .filter((f: any) => f.start < f.end && f.status !== "false_positive")
      .sort((a: any, b: any) => a.start - b.start);
    for (const f of ranges) {
      if (f.start < cursor) continue;
      result.push(
        <React.Fragment key={f.id}>
          {doc.text.slice(cursor, f.start)}
          <mark className={f.severity} title={f.explanation}>
            {doc.text.slice(f.start, f.end)}
          </mark>
        </React.Fragment>,
      );
      cursor = f.end;
    }
    result.push(doc.text.slice(cursor));
    return result;
  };
  return (
    <>
      <div className="editor-title">
        <div>
          <button className="text-btn muted" onClick={back}>
            Content library <ChevronRight size={13} /> Review
          </button>
          <h1>{doc.title}</h1>
          <div className="inline-meta">
            <Status value={doc.status} />
            <span>Revision {doc.revision}</span>
            <span>Sources v{state.sourceVersion}</span>
            <span>{doc.creatorName}</span>
          </div>
        </div>
        <div className="actions">
          <Button
            onClick={() =>
              download(
                "/documents/" + doc.id + "/export?format=pdf",
                "proofline-approved-report.pdf",
              )
            }
            disabled={!doc.readiness.eligible}
          >
            <Download size={16} /> Export report
          </Button>
          {isOwner && (
            <Button variant="primary" disabled={busy || !dirty} onClick={save}>
              {busy ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <Check size={16} />
              )}{" "}
              Save revision
            </Button>
          )}
        </div>
      </div>
      <div className={"readiness " + (doc.readiness.eligible ? "ready" : "")}>
        <span className="readiness-icon">
          {doc.readiness.eligible ? (
            <ShieldCheck size={23} />
          ) : (
            <Shield size={23} />
          )}
        </span>
        <div>
          <strong>
            {doc.readiness.eligible
              ? "This exact version is approved for release."
              : "Release readiness"}
          </strong>
          <p>
            {doc.readiness.eligible
              ? "Export rechecks this state atomically and creates a receipt."
              : doc.readiness.reasons.join(" ")}
          </p>
        </div>
        <Badge tone={doc.readiness.eligible ? "green" : "amber"}>
          {doc.readiness.eligible ? "READY TO EXPORT" : "NOT YET ELIGIBLE"}
        </Badge>
      </div>
      <div className="editor-grid">
        <section className="panel editor-main">
          <div className="panel-heading">
            <h2>
              <FileText size={18} /> Content workspace
            </h2>
            <Badge>{dirty ? "Unsaved changes" : "Saved version"}</Badge>
          </div>
          <div className="editor-form">
            <Field label="Title">
              <input
                value={title}
                readOnly={!isOwner}
                onChange={(e) => sTitle(e.target.value)}
              />
            </Field>
            <div className="three-cols">
              <Field label="Channel">
                <select
                  disabled={!isOwner}
                  value={context.channel}
                  onChange={(e) => sc({ ...context, channel: e.target.value })}
                >
                  {["website", "email", "social", "support", "internal"].map(
                    (x) => (
                      <option key={x}>{x}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Audience">
                <input
                  readOnly={!isOwner}
                  value={context.audience}
                  onChange={(e) => sc({ ...context, audience: e.target.value })}
                />
              </Field>
              <Field label="Purpose">
                <input
                  readOnly={!isOwner}
                  value={context.purpose}
                  onChange={(e) => sc({ ...context, purpose: e.target.value })}
                />
              </Field>
            </div>
            <div className="editor-label">
              <strong>DRAFT TEXT</strong>
              <span>
                {text.trim().split(/\s+/).filter(Boolean).length} / 3,000 words
              </span>
            </div>
            <textarea
              className="draft-editor"
              ref={draftRef}
              rows={10}
              readOnly={!isOwner}
              value={text}
              onChange={(e) => st(e.target.value)}
              spellCheck={false}
            />
            {isOwner && (
              <div className="snippet-actions">
                <button className="text-btn" onClick={() => st(approvedSample)}>
                  <Clipboard size={14} /> Insert corrected sample
                </button>
                <select
                  aria-label="Insert approved wording"
                  value=""
                  onChange={(ev) => {
                    if (ev.target.value)
                      st(text + (text ? "\n" : "") + ev.target.value);
                  }}
                >
                  <option value="">Insert source-bound wording…</option>
                  {state.rules
                    .filter(
                      (r: any) =>
                        r.active &&
                        r.quote &&
                        state.sources.some(
                          (s: any) =>
                            s.id === r.sourceId &&
                            s.active &&
                            s.body.includes(r.quote),
                        ),
                    )
                    .map((r: any) => (
                      <option key={r.id} value={r.quote}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <small className="form-note">
              Approved wording does not approve the complete document. Any
              content or context edit requires a new review.
            </small>
            {doc.review && !dirty && (
              <details className="highlights">
                <summary>
                  <Eye size={15} /> Show saved text with issue highlights
                </summary>
                <div>{highlights()}</div>
              </details>
            )}
          </div>
          <div className="review-controls">
            <div className="toggle-row">
              <label style={{ opacity: config?.aiConfigured ? 1 : 0.65, cursor: config?.aiConfigured ? "pointer" : "not-allowed" }}>
                <input
                  type="checkbox"
                  checked={useAI && Boolean(config?.aiConfigured)}
                  disabled={!isOwner || !config?.aiConfigured}
                  onChange={(e) => sai(e.target.checked)}
                />
                <Sparkles size={16} /> Include contextual AI review
              </label>
              <Badge tone={config?.aiConfigured ? "green" : "neutral"}>
                {config?.aiConfigured ? "API configured" : "Offline mode (Rules only)"}
              </Badge>
            </div>
            {!config?.aiConfigured && (
              <small className="form-note" style={{ display: "block", marginTop: "3px", fontSize: "11px" }}>
                Deterministic rule engine is active (all 7 policy rules verified). Configure <code>OPENAI_API_KEY</code> or <code>GEMINI_API_KEY</code> in environment to enable optional LLM contextual review.
              </small>
            )}
            {useAI && config?.aiConfigured && (
              <label className="checkbox-note">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => sConsent(e.target.checked)}
                />{" "}
                I consent to this text and up to five approved source passages
                being sent to the configured OpenAI service. Provider retention
                must be reviewed before confidential use.
              </label>
            )}
            <div className="form-actions">
              <div className="review-state">
                {active ? (
                  <Loader2 className="spin" size={17} />
                ) : (
                  <FlaskConical size={17} />
                )}
                <span>
                  {active
                    ? doc.review.status === "queued"
                      ? "Queued for review"
                      : "Reviewing content…"
                    : "Backend checks · source-bound findings"}
                </span>
              </div>
              <Button
                variant="primary"
                onClick={queue}
                disabled={
                  !isOwner || busy || dirty || active || (useAI && config?.aiConfigured && !consent)
                }
              >
                <Search size={16} />
                {active ? "Review in progress" : "Run review"}
              </Button>
            </div>
            {doc.review && (
              <div
                className={
                  "coverage " +
                  (doc.review.status === "partial" ? "partial" : "")
                }
              >
                <strong>
                  {doc.review.status === "complete"
                    ? "COMPREHENSIVE REVIEW (AI + RULES)"
                    : "DETERMINISTIC RULE REVIEW (PARTIAL)"}
                </strong>
                <p>{doc.review.message}</p>
                {doc.review.status === "partial" && (
                  <p style={{ margin: "6px 0", fontSize: "12px", fontWeight: 600 }}>
                    {doc.review.coverage?.ruleCount ?? 7} active policy rules executed. Human reviewer confirms semantic coverage before approval.
                  </p>
                )}
                {doc.review.coverage && (
                  <small>
                    Rules: {doc.review.coverage.rules}
                    <br />
                    Semantics: {doc.review.coverage.semantics}
                  </small>
                )}
              </div>
            )}
            {doc.review?.coverage && (
              <div className="checked">
                <strong>WHAT WAS CHECKED</strong>
                <ul>
                  <li>
                    {doc.review.coverage.ruleCount ?? 0} active rules from
                    source pack v{doc.review.sourceVersion} executed
                  </li>
                  <li>
                    {doc.findings.length} finding(s) recorded for revision{" "}
                    {doc.review.revision}
                  </li>
                  <li>
                    Coverage status: {doc.review.status} —{" "}
                    {doc.review.status === "partial"
                      ? "Deterministic rules verified; human confirms semantic coverage before release."
                      : "all configured checks completed"}
                  </li>
                  <li>
                    Not checked:{" "}
                    {doc.review.coverage.notChecked ||
                      "meaning and intent, images, off-platform facts, legal compliance"}
                  </li>
                </ul>
              </div>
            )}
          </div>
          {isOwner && (
            <div className="submit-bar">
              <div>
                <strong>Ready for another pair of eyes?</strong>
                <p>Submit the saved, reviewed version to a different person.</p>
              </div>
              <Button
                onClick={() =>
                  safe(
                    () => api("/documents/" + doc.id + "/submit", "POST"),
                    "Sent to the review inbox. Switch role to Reviewer to approve.",
                  )
                }
                disabled={dirty || active || !doc.review}
              >
                <Send size={16} /> Request approval
              </Button>
            </div>
          )}
          {canReview && (
            <div className="decision-box">
              <h3>
                <ShieldCheck size={18} /> Reviewer decision
              </h3>
              {doc.review?.status === "partial" && (
                <p style={{ margin: "4px 0 10px 0", fontSize: "12px", color: "var(--muted)" }}>
                  Partial = rules ran; semantic/AI review did not. A human confirms coverage before approval.
                </p>
              )}
              <label className="checkbox-note">
                <input
                  type="checkbox"
                  checked={manual}
                  onChange={(e) => sm(e.target.checked)}
                />{" "}
                I checked the full content, context, support and unresolved
                conditions. Any semantic coverage not completed by AI was
                reviewed by me.
              </label>
              <textarea
                rows={2}
                placeholder="Decision rationale / requested changes…"
                value={decisionReason}
                onChange={(e) => sdr(e.target.value)}
              />
              <div className="actions">
                <Button
                  onClick={() =>
                    safe(
                      () =>
                        api("/documents/" + doc.id + "/decision", "POST", {
                          outcome: "changes_requested",
                          reason: decisionReason,
                          expectedRevision: doc.revision,
                        }),
                      "Changes requested.",
                    )
                  }
                >
                  <MessageSquare size={16} /> Request changes
                </Button>
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() =>
                    safe(
                      () =>
                        api("/documents/" + doc.id + "/decision", "POST", {
                          outcome: "approved",
                          manualCoverage: manual,
                          reason: decisionReason,
                          expectedRevision: doc.revision,
                        }),
                      "Exact version approved. Export is now checked against current server state.",
                    )
                  }
                >
                  <Check size={16} /> Approve exact version
                </Button>
              </div>
              <small>
                Approval requires no unresolved findings. Missing evidence and
                integrity failures cannot be waived.
              </small>
            </div>
          )}
          {doc.decision && (
            <div className="decision-record">
              <CheckCircle2 size={17} />
              <div>
                <strong>
                  {doc.decision.outcome === "approved"
                    ? "Approval recorded"
                    : "Changes requested"}{" "}
                  by {doc.decision.reviewerName}
                </strong>
                <p>
                  Revision {doc.decision.revision} · source pack v
                  {doc.decision.sourceVersion} · {fmt(doc.decision.at)}
                </p>
                {doc.decision.reason && <p>{doc.decision.reason}</p>}
                {doc.decision.outcome === "approved" &&
                  !doc.readiness.eligible && (
                    <div className="stale-note">
                      <AlertTriangle size={14} />
                      <span>
                        <strong>
                          This approval no longer authorises export.
                        </strong>{" "}
                        Approved revision {doc.decision.revision} / source pack
                        v{doc.decision.sourceVersion}; you are viewing revision{" "}
                        {doc.revision} / source pack v{state.sourceVersion}.{" "}
                        {doc.readiness.reasons[0]} Run a new review and ask a
                        reviewer to approve this revision.
                      </span>
                    </div>
                  )}
              </div>
            </div>
          )}
          {doc.readiness.eligible && (
            <div className="export-options">
              <Button
                onClick={() =>
                  download(
                    "/documents/" + doc.id + "/export",
                    "proofline-receipt.json",
                  )
                }
              >
                <Download size={16} /> Content + receipt JSON
              </Button>
              <Button
                onClick={() =>
                  download(
                    "/documents/" + doc.id + "/export?format=txt",
                    "proofline-approved.txt",
                  )
                }
              >
                <FileText size={16} /> Approved text
              </Button>
            </div>
          )}
          {isOwner && (
            <div className="padded">
              <button
                className="text-btn muted"
                onClick={() => {
                  if (
                    confirm(
                      "Delete this draft and its derived review/history/comments? Minimal historical receipt metadata remains; delete original uploads separately in Settings.",
                    )
                  )
                    safe(async () => {
                      await api("/documents/" + doc.id, "DELETE");
                      back();
                    }, "Draft and derived review content deleted.");
                }}
              >
                <Trash2 size={14} /> Delete content and review history
              </button>
            </div>
          )}
        </section>
        <aside className="panel review-panel">
          <div className="tabs">
            {[
              ["findings", "Findings", doc.findings.length],
              ["comments", "Comments", doc.comments.length],
              ["history", "History", doc.history.length],
            ].map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => srt(key as string)}
                className={rightTab === key ? "active" : ""}
              >
                {label}
                <span>{count}</span>
              </button>
            ))}
          </div>
          {rightTab === "findings" && (
            <div className="finding-list">
              {!doc.review ? (
                <Empty
                  icon={Search}
                  title="The evidence starts here"
                  body="Run a review to inspect actual findings. Nothing on this panel is generated in advance."
                />
              ) : active ? (
                <Empty
                  icon={Loader2}
                  title="Checking the saved version"
                  body="You can keep exploring. Results are tied to this revision and source pack."
                />
              ) : !doc.findings.length ? (
                <Empty
                  icon={CheckCircle2}
                  title="No configured-rule issues found"
                  body="This is not an automatic approval. Review coverage and human judgement still matter."
                />
              ) : (
                doc.findings.map((f: any) => (
                  <article
                    className={
                      "finding " +
                      (f.status === "false_positive" ? "resolved" : "")
                    }
                    key={f.id}
                  >
                    <div className="finding-meta">
                      <Badge
                        tone={
                          f.severity === "high"
                            ? "red"
                            : f.severity === "medium"
                              ? "amber"
                              : "blue"
                        }
                      >
                        {f.severity}
                      </Badge>
                      <Badge>{f.provenance}</Badge>
                    </div>
                    <h3>{f.ruleName}</h3>
                    {f.text && <blockquote>{f.text}</blockquote>}
                    <p>{f.explanation}</p>
                    {f.quote ? (
                      <div className="source-quote">
                        <div>
                          <BookOpen size={13} />
                          {f.sourceTitle} · {f.sourceId?.slice(0, 8)}
                        </div>
                        <q>{f.quote}</q>
                      </div>
                    ) : (
                      <div className="no-evidence">
                        <AlertTriangle size={14} /> No approved supporting quote
                        found. This is not proof of falsehood.
                      </div>
                    )}
                    {f.suggestion && (
                      <div className="suggestion">
                        <small>SUGGESTED CORRECTION</small>
                        <p>{f.suggestion}</p>
                      </div>
                    )}
                    <div className="finding-actions">
                      {isOwner && f.suggestion && (
                        <Button
                          disabled={dirty || active || busy}
                          variant="soft"
                          onClick={() => openSuggestion(f)}
                        >
                          <GitCompareArrows size={14} /> Inspect fix
                        </Button>
                      )}
                      {isOwner && (
                        <button className="text-btn" onClick={() => rewrite(f)}>
                          Rewrite
                        </button>
                      )}
                      <button
                        className="text-btn"
                        onClick={() => {
                          sContest(f);
                          sComment("");
                          srt("comments");
                        }}
                      >
                        Contest
                      </button>
                      <button
                        className="text-btn"
                        onClick={() => {
                          sFeedback(f);
                          sReason("");
                        }}
                      >
                        {canReview ? "Resolve / feedback" : "Feedback"}
                      </button>
                    </div>
                    {f.status !== "open" && (
                      <Badge
                        tone={f.status === "false_positive" ? "green" : "amber"}
                      >
                        {f.status.replaceAll("_", " ")}
                      </Badge>
                    )}
                  </article>
                ))
              )}
            </div>
          )}
          {rightTab === "comments" && (
            <div className="comments">
              <div className="comment-compose">
                {contest && (
                  <div className="callout">
                    <MessageSquare size={16} /> Contesting {contest.ruleName}
                    <button onClick={() => sContest(null)} className="icon-btn">
                      <X size={13} />
                    </button>
                  </div>
                )}
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => sComment(e.target.value)}
                  placeholder="Ask for evidence, explain intent, or clarify a rule…"
                />
                <Button
                  variant="primary"
                  disabled={!comment.trim()}
                  onClick={() =>
                    safe(async () => {
                      await api("/documents/" + doc.id + "/comments", "POST", {
                        text: comment,
                        findingId: contest?.id,
                      });
                      sComment("");
                      sContest(null);
                    }, "Comment recorded.")
                  }
                >
                  <Send size={14} /> Add comment
                </Button>
              </div>
              {doc.comments.length ? (
                doc.comments.map((c: any) => (
                  <div className="comment" key={c.id}>
                    <div className="comment-who">
                      <strong>{c.by}</strong>
                      <Badge>{c.role}</Badge>
                    </div>
                    <p>{c.text}</p>
                    <small>{fmt(c.at)}</small>
                  </div>
                ))
              ) : (
                <p className="muted center">
                  No comments yet. Give the next reviewer useful context.
                </p>
              )}
            </div>
          )}
          {rightTab === "history" && (
            <div className="history-list">
              {[...doc.history].reverse().map((h: any) => (
                <details key={h.revision}>
                  <summary>
                    <span className="revision-dot">{h.revision}</span>
                    <div>
                      <strong>Revision {h.revision}</strong>
                      <small>
                        {h.by} · {fmt(h.at)}
                      </small>
                    </div>
                    <ChevronDown size={15} />
                  </summary>
                  <pre>{h.text}</pre>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <small>SHA-256 fingerprint</small>
                    <button
                      type="button"
                      className="text-btn"
                      style={{ fontSize: "11px" }}
                      onClick={() =>
                        safe(async () => {
                          const v = await api("/documents/" + doc.id + "/verify");
                          alert(
                            v.fingerprint === h.fingerprint
                              ? "Fingerprint MATCHES: Document buffer is byte-for-byte identical to the server state."
                              : "Fingerprint CHANGED: Buffer differs from historical revision " + h.revision
                          );
                        })
                      }
                    >
                      <ShieldCheck size={12} /> Verify live
                    </button>
                  </div>
                  <code>{h.fingerprint}</code>
                </details>
              ))}
            </div>
          )}
        </aside>
      </div>
      {suggestion && (
        <Modal
          title="Inspect the correction before applying"
          onClose={() => ss(null)}
          wide
        >
          <div className="diff-view-box">
            <h4>Lexical Transformation (Inline Visual Diff)</h4>
            <p className="diff-view-content">
              {computeWordDiff(doc.text, suggestion.text).map((part, idx) =>
                part.type === "del" ? (
                  <del key={idx} className="diff-del">{part.text}</del>
                ) : part.type === "ins" ? (
                  <ins key={idx} className="diff-ins">{part.text}</ins>
                ) : (
                  <span key={idx}>{part.text}</span>
                )
              )}
            </p>
          </div>
          <div className="compare-grid">
            <div>
              <h3>Current saved text</h3>
              <pre>{doc.text}</pre>
            </div>
            <div>
              <h3>Proposed text</h3>
              <pre>{suggestion.text}</pre>
            </div>
          </div>
          <div className="callout">
            <GitCompareArrows size={20} />
            <div>
              <strong>Suggestion regression checks</strong>
              <p>
                Numbers:{" "}
                {suggestion.regression.numbersBefore.join(", ") || "none"} →{" "}
                {suggestion.regression.numbersAfter.join(", ") || "none"}.
                Removed qualifiers:{" "}
                {suggestion.regression.removedQualifiers.join(", ") || "none"}.
              </p>
              <p>
                {suggestion.findingsAfter.length} deterministic finding(s) would
                remain. Inspect changed facts and intent; this is not an
                approval.
              </p>
            </div>
          </div>
          <div className="form-actions">
            <Button onClick={() => ss(null)}>Keep original</Button>
            <Button
              variant="primary"
              onClick={() =>
                safe(async () => {
                  await api("/documents/" + doc.id, "PUT", {
                    text: suggestion.text,
                    title: doc.title,
                    context: doc.context,
                    expectedRevision: doc.revision,
                  });
                  ss(null);
                  await api("/documents/" + doc.id + "/review", "POST", {
                    useAI: false,
                    consent: false,
                  });
                }, "Correction saved as a new revision; deterministic checks queued.")
              }
            >
              <Check size={16} /> Apply & recheck
            </Button>
          </div>
        </Modal>
      )}
      {feedback && (
        <Modal
          title="Record finding-resolution feedback"
          onClose={() => sFeedback(null)}
        >
          <p>{feedback.ruleName}</p>
          <Field label="Reason">
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => sReason(e.target.value)}
              placeholder="Explain what should change or why this finding is incorrect…"
            />
          </Field>
          <div className="form-actions">
            <Button
              onClick={() =>
                safe(async () => {
                  await api("/documents/" + doc.id + "/feedback", "POST", {
                    findingId: feedback.id,
                    outcome: "clarification",
                    reason,
                  });
                  sFeedback(null);
                }, "Feedback recorded for the manager. Human approval is unchanged.")
              }
            >
              Request rule clarification
            </Button>
            {canReview && (
              <Button
                variant="primary"
                onClick={() =>
                  safe(async () => {
                    await api("/documents/" + doc.id + "/feedback", "POST", {
                      findingId: feedback.id,
                      outcome: "false_positive",
                      reason,
                    });
                    sFeedback(null);
                  }, "Reviewer resolution recorded with a reason.")
                }
              >
                Mark supported false positive
              </Button>
            )}
          </div>
          <p className="form-note">
            No-evidence, privacy and expired-source findings cannot be dismissed
            into a clean release.
          </p>
        </Modal>
      )}
    </>
  );
}

function Sources({ state, safe, busy, notify }: any) {
  const [editId, setEditId] = useState<string | null>(null),
    [sourceModal, ssm] = useState(false),
    [ruleModal, srm] = useState(false),
    [title, st] = useState(""),
    [body, sb] = useState(""),
    [rule, sr] = useState<any>({
      name: "",
      kind: "terminology",
      pattern: "",
      replacement: "",
      quote: "",
      sourceId: state.sources[0]?.id || "",
      severity: "medium",
      channel: "any",
      section: "any",
      factKey: "",
      maxValue: 20,
      requireUpTo: true,
      audience: "",
      product: "",
      validUntil: "",
      variants: [],
      allowQuoted: false,
    });
  const manager = state.actor.role === "manager";
  const editRule = (r: any) => {
    sr({ ...r, variants: r.variants || [] });
    setEditId(r.id);
    srm(true);
  };
  const activateRule = async (r: any) => {
    try {
      const impact = await api("/sources/impact", "POST", { ruleId: r.id });
      const changed = impact.documents.filter(
        (d: any) => d.after !== d.before,
      ).length;
      const approvals = impact.documents.filter(
        (d: any) => d.approvalWillNeedReview,
      ).length;
      if (
        !confirm(
          "Activate “" +
            r.name +
            "”?\n\nThis creates source pack v" +
            (state.sourceVersion + 1) +
            ".\nDocuments whose findings change: " +
            changed +
            ".\nApprovals that will need re-review: " +
            approvals +
            ".",
        )
      )
        return;
      await safe(
        () => api("/rules/" + r.id + "/activate", "POST"),
        "Rule activated with a new source-pack version.",
      );
    } catch (e: any) {
      notify({ error: true, text: e.message });
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="BRAND KNOWLEDGE"
        title="The source of truth starts with you."
        body="Import, confirm and version the information your team is allowed to rely on."
        action={
          <div className="actions">
            <Button
              disabled={!manager}
              onClick={() => {
                setEditId(null);
                srm(true);
              }}
            >
              <Plus size={16} /> Draft rule
            </Button>
            <Button
              variant="primary"
              disabled={!manager}
              onClick={() => ssm(true)}
            >
              <Upload size={16} /> Add source
            </Button>
          </div>
        }
      />
      <div className="callout">
        <BookOpen size={20} />
        <div>
          <strong>Active source pack v{state.sourceVersion}</strong>
          <p>
            Activation changes the trusted pack. Previous reviews and approvals
            will need re-review. Imported text is not automatically approved.
          </p>
        </div>
        {!manager && <Badge>Manager role required to edit</Badge>}
      </div>
      <div className="knowledge-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Approved & staged sources</h2>
            <Badge>{state.sources.length}</Badge>
          </div>
          {state.sources.map((s: any) => (
            <article className="source-card" key={s.id}>
              <div className="source-title">
                <span className="doc-icon">
                  <BookOpen size={18} />
                </span>
                <div>
                  <h3>{s.title}</h3>
                  <small>
                    {s.id} ·{" "}
                    {s.active ? "Confirmed source" : "Staged — not trusted yet"}
                  </small>
                </div>
                <Badge tone={s.active ? "green" : "amber"}>
                  {s.active ? "Active" : "Draft"}
                </Badge>
              </div>
              <p>{s.body}</p>
              {manager && (
                <div className="rule-actions">
                  <Button
                    variant="soft"
                    onClick={() => {
                      if (
                        confirm(
                          "Confirm this source as organisation-approved? This creates a new active source-pack version and invalidates old approvals.",
                        )
                      )
                        safe(
                          () => api("/sources/" + s.id + "/activate", "POST"),
                          "Source pack updated. Old approvals cannot be reused.",
                        );
                    }}
                  >
                    <Check size={14} />
                    {s.active
                      ? "Reconfirm as new pack version"
                      : "Confirm & activate"}
                  </Button>
                  {s.active && (
                    <Button
                      onClick={() => {
                        if (
                          confirm(
                            "Retire this source? Rules that quote it will report a source problem and cannot approve content.",
                          )
                        )
                          safe(
                            () => api("/sources/" + s.id + "/retire", "POST"),
                            "Source retired. Its rules now report a source problem.",
                          );
                      }}
                    >
                      <X size={14} /> Retire
                    </Button>
                  )}
                </div>
              )}
            </article>
          ))}
          {!state.sources.length && (
            <Empty
              icon={BookOpen}
              title="No approved source yet"
              body="Import text and have a manager confirm it before relying on it."
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Rules & structured facts</h2>
            <Badge>
              {state.rules.filter((r: any) => r.active).length} active
            </Badge>
          </div>
          {state.rules.map((r: any) => (
            <article className="rule-card" key={r.id}>
              <div>
                <Badge tone={r.active ? "green" : "amber"}>
                  {r.active ? "Active" : "Draft"}
                </Badge>
                <Badge>{r.kind}</Badge>
              </div>
              <h3>{r.name}</h3>
              <p>
                {r.kind === "claim"
                  ? `Maximum ${r.maxValue}% · ${r.audience || "audience not set"} · ${r.product || "scope not set"}`
                  : r.pattern + " → " + r.replacement}
              </p>
              <q>{r.quote || "No source quote set"}</q>
              <small>
                Channel: {r.channel || "any"} · Section: {r.section || "any"}
                {r.validUntil ? " · Valid until " + r.validUntil : ""}
              </small>
              {manager && (
                <div className="rule-actions">
                  {!r.active ? (
                    <Button variant="soft" onClick={() => activateRule(r)}>
                      <Check size={14} /> Activate
                    </Button>
                  ) : (
                    <Button
                      variant="soft"
                      onClick={() => {
                        if (
                          confirm(
                            "Deactivate this rule? It will no longer run, and existing approvals will need re-review.",
                          )
                        )
                          safe(
                            () => api("/rules/" + r.id + "/deactivate", "POST"),
                            "Rule deactivated; approvals require re-review.",
                          );
                      }}
                    >
                      Deactivate
                    </Button>
                  )}
                  <Button onClick={() => editRule(r)}>
                    <Settings size={14} /> Edit
                  </Button>
                  {!r.active && (
                    <Button
                      onClick={() => {
                        if (confirm("Delete this draft rule permanently?"))
                          safe(
                            () => api("/rules/" + r.id, "DELETE"),
                            "Draft rule deleted.",
                          );
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
      {sourceModal && (
        <Modal
          title="Stage an approved-information source"
          onClose={() => ssm(false)}
          wide
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              safe(async () => {
                await api("/sources", "POST", { title, body });
                ssm(false);
                st("");
                sb("");
              }, "Source staged. Confirm its facts and activate it separately.");
            }}
          >
            <Field label="Source title">
              <input
                required
                value={title}
                onChange={(e) => st(e.target.value)}
              />
            </Field>
            <Field label="Source text">
              <textarea
                rows={10}
                required
                value={body}
                onChange={(e) => sb(e.target.value)}
                placeholder="Paste guidelines, facts and approved wording…"
              />
            </Field>
            <div className="form-actions">
              <label className="btn">
                <Upload size={15} /> Import PDF / text
                <input
                  type="file"
                  hidden
                  accept=".pdf,.txt,.md"
                  onChange={async (ev) => {
                    const f = ev.target.files?.[0];
                    if (!f) return;
                    const fd = new FormData();
                    fd.append("file", f);
                    try {
                      const r = await api("/extract", "POST", fd);
                      sb(r.text);
                      if (!title) st(f.name);
                    } catch (er: any) {
                      notify({ error: true, text: er.message });
                    }
                  }}
                />
              </label>
              <Button type="submit" variant="primary">
                Stage for confirmation <ArrowRight size={16} />
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {ruleModal && (
        <Modal
          title={
            editId ? "Edit source-bound rule" : "Draft a source-bound rule"
          }
          onClose={() => {
            srm(false);
            setEditId(null);
          }}
          wide
        >
          <form
            onSubmit={(ev) => {
              ev.preventDefault();
              safe(async () => {
                if (editId) {
                  const out = await api("/rules/" + editId, "PUT", rule);
                  srm(false);
                  setEditId(null);
                  if (out.reactivate)
                    notify({
                      text: "Active rule saved as an inactive draft. Activate it again to apply the change; previous approvals need re-review.",
                    });
                } else {
                  await api("/rules", "POST", rule);
                  srm(false);
                }
              }, "Rule saved. Test it in the laboratory before activation.");
            }}
          >
            <div className="two-cols">
              <Field label="Rule name">
                <input
                  required
                  value={rule.name}
                  onChange={(e) => sr({ ...rule, name: e.target.value })}
                />
              </Field>
              <Field label="Check type">
                <select
                  value={rule.kind}
                  onChange={(e) => sr({ ...rule, kind: e.target.value })}
                >
                  {[
                    "terminology",
                    "claim",
                    "required",
                    "tone",
                    "prohibited",
                    "internal",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="two-cols">
              <Field label="Source">
                <select
                  required
                  value={rule.sourceId}
                  onChange={(e) => sr({ ...rule, sourceId: e.target.value })}
                >
                  <option value="">Choose source</option>
                  {state.sources.map((s: any) => (
                    <option value={s.id} key={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Exact approved quote">
                <input
                  required
                  value={rule.quote}
                  onChange={(e) => sr({ ...rule, quote: e.target.value })}
                />
              </Field>
            </div>
            <div className="two-cols">
              <Field
                label={
                  rule.kind === "required"
                    ? "Trigger phrase"
                    : "Term / literal phrase"
                }
              >
                <input
                  value={rule.pattern}
                  onChange={(e) => sr({ ...rule, pattern: e.target.value })}
                />
              </Field>
              <Field
                label={
                  rule.kind === "required"
                    ? "Required qualification"
                    : "Suggested replacement"
                }
              >
                <input
                  value={rule.replacement}
                  onChange={(e) => sr({ ...rule, replacement: e.target.value })}
                />
              </Field>
            </div>
            {rule.kind === "claim" && (
              <div className="two-cols">
                <Field label="Maximum percentage">
                  <input
                    type="number"
                    value={rule.maxValue}
                    onChange={(e) => sr({ ...rule, maxValue: e.target.value })}
                  />
                </Field>
                <Field label="Fact key">
                  <input
                    value={rule.factKey}
                    placeholder="e.g. plan.pilot.savings"
                    onChange={(e) => sr({ ...rule, factKey: e.target.value })}
                  />
                </Field>
                <Field label="Required audience wording">
                  <input
                    value={rule.audience}
                    onChange={(e) => sr({ ...rule, audience: e.target.value })}
                  />
                </Field>
                <Field label="Required product scope">
                  <input
                    value={rule.product}
                    onChange={(e) => sr({ ...rule, product: e.target.value })}
                  />
                </Field>
                <label className="checkbox-note">
                  <input
                    type="checkbox"
                    checked={rule.requireUpTo}
                    onChange={(e) =>
                      sr({ ...rule, requireUpTo: e.target.checked })
                    }
                  />{" "}
                  Require “up to”
                </label>
              </div>
            )}
            <details className="advanced">
              <summary>Context, variants and validity</summary>
              <div className="two-cols">
                <Field label="Channel profile">
                  <select
                    value={rule.channel}
                    onChange={(e) => sr({ ...rule, channel: e.target.value })}
                  >
                    {[
                      "any",
                      "website",
                      "email",
                      "social",
                      "support",
                      "internal",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Section (or any)">
                  <input
                    value={rule.section}
                    onChange={(e) => sr({ ...rule, section: e.target.value })}
                  />
                </Field>
                <Field label="Valid until (optional)">
                  <input
                    type="date"
                    value={rule.validUntil}
                    onChange={(e) =>
                      sr({ ...rule, validUntil: e.target.value })
                    }
                  />
                </Field>
                <Field label="Term variants (comma separated)">
                  <input
                    onChange={(e) =>
                      sr({
                        ...rule,
                        variants: e.target.value
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
                <Field label="Severity">
                  <select
                    value={rule.severity}
                    onChange={(e) => sr({ ...rule, severity: e.target.value })}
                  >
                    {["low", "medium", "high"].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
                <label className="checkbox-note">
                  <input
                    type="checkbox"
                    checked={rule.allowQuoted}
                    onChange={(e) =>
                      sr({ ...rule, allowQuoted: e.target.checked })
                    }
                  />{" "}
                  Allow this term inside explicit double quotes
                </label>
              </div>
            </details>
            <p className="form-note">
              Rules use literal whole-word phrases. Claims are bounded
              structured comparisons, not general factual verification. A valid
              exact source quote is required for activation.
            </p>
            <Button type="submit" variant="primary">
              {editId ? "Save rule changes" : "Save draft rule"}
            </Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Laboratory({ state, safe, notify }: any) {
  const [text, st] = useState(
      "Every customer is guaranteed to save 50% on every plan.",
    ),
    [rid, sr] = useState(state.rules[0]?.id || ""),
    [result, ss] = useState<any>(null),
    [impact, si] = useState<any>(null);
  const manager = state.actor.role === "manager";
  return (
    <>
      <PageTitle
        eyebrow="RULE LABORATORY"
        title="Test the rule. Before it tests your team."
        body="Run actual deterministic checks on acceptable, problematic and borderline wording."
      />
      <div className="lab-grid">
        <section className="panel padded">
          <Badge tone="blue">NO ACTIVATION IN THIS SANDBOX</Badge>
          <h2>Experiment with wording</h2>
          <Field label="Include a draft rule">
            <select value={rid} onChange={(e) => sr(e.target.value)}>
              {state.rules.map((r: any) => (
                <option value={r.id} key={r.id}>
                  {r.name}
                  {r.active ? " · active" : " · draft"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Test content">
            <textarea
              rows={9}
              value={text}
              onChange={(e) => st(e.target.value)}
            />
          </Field>
          <div className="snippet-actions">
            <button className="text-btn" onClick={() => st(approvedSample)}>
              Acceptable example
            </button>
            <button
              className="text-btn"
              onClick={() =>
                st(
                  "Act now. Every customer is guaranteed to save 50% on every plan.",
                )
              }
            >
              Problematic example
            </button>
          </div>
          <div className="form-actions">
            <Button
              disabled={!manager}
              onClick={() =>
                safe(async () =>
                  si(await api("/sources/impact", "POST", { ruleId: rid })),
                )
              }
            >
              Preview document impact
            </Button>
            <Button
              variant="primary"
              disabled={!manager}
              onClick={() =>
                safe(async () =>
                  ss(
                    await api("/rules/sandbox", "POST", {
                      ruleId: rid,
                      text,
                      context: {
                        channel: "website",
                        audience: "public",
                        purpose: "Product launch",
                      },
                    }),
                  ),
                )
              }
            >
              <FlaskConical size={16} /> Test wording
            </Button>
          </div>
          {!manager && (
            <p className="form-note">
              Switch role to Manager to run the rule laboratory.
            </p>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Observed checker results</h2>
            {result && <Badge>{result.findings.length} findings</Badge>}
          </div>
          {result ? (
            <div className="padded">
              <p className="form-note">{result.note}</p>
              {result.findings.length ? (
                result.findings.map((f: any) => (
                  <div className="lab-finding" key={f.id}>
                    <Badge tone={f.severity === "high" ? "red" : "amber"}>
                      {f.category}
                    </Badge>
                    <h3>{f.ruleName}</h3>
                    <p>{f.explanation}</p>
                    {f.quote && <q>{f.quote}</q>}
                  </div>
                ))
              ) : (
                <Empty
                  icon={CheckCircle2}
                  title="No configured-rule findings"
                  body="This is a sandbox observation, not a guarantee or human approval."
                />
              )}
            </div>
          ) : (
            <Empty
              icon={FlaskConical}
              title="Try a real rule execution"
              body="Results appear only after you run the checker."
            />
          )}
          {impact && (
            <div className="padded impact">
              <h3>Rule-change preview</h3>
              <p className="form-note">{impact.note}</p>
              {impact.documents.map((d: any) => (
                <div className="mini-row" key={d.id}>
                  <span>{d.title}</span>
                  <strong>
                    {d.before} → {d.after} findings
                  </strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Visuals({ state, safe, notify }: any) {
  const [file, sf] = useState<File | null>(null),
    [alt, sa] = useState(""),
    [kind, sk] = useState("informative"),
    [fg, sfg] = useState("#14253f"),
    [bg, sbg] = useState("#ffffff"),
    [large, sl] = useState(false),
    [crop, sc] = useState({ x: 0, y: 0, width: 100, height: 100 }),
    [cropOn, sco] = useState(false),
    [result, sr] = useState<any>(null),
    [aid, sid] = useState(""),
    [reason, sreason] = useState(""),
    [did, sd] = useState("");
  const manager = state.actor.role === "manager";
  return (
    <>
      <PageTitle
        eyebrow="VISUAL & ACCESSIBILITY"
        title="Approved assets. Clearer content."
        body="Bounded logo candidates, declared-colour contrast and alt-text presence—not a full visual or accessibility audit."
      />
      <div className="callout amber">
        <Eye size={20} />
        <div>
          <strong>Recognition is not proof of correct usage.</strong>
          <p>
            Average hashes can collide. Unknown or changed logos need human
            inspection against an approved asset. No OCR or arbitrary-layout
            understanding is claimed.
          </p>
        </div>
      </div>
      <div className="visual-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Approved asset library</h2>
            <Badge>{state.assets.length}</Badge>
          </div>
          <div className="asset-grid">
            {state.assets.map((a: any) => (
              <div className="asset-card" key={a.id}>
                <div className="asset-thumb">
                  <img src={"/api/files/" + a.fileId} alt={a.name} />
                </div>
                <strong>{a.name}</strong>
                <small>
                  {a.width} × {a.height} · approved source asset
                </small>
              </div>
            ))}
          </div>
          {!state.assets.length && (
            <Empty
              icon={ImageIcon}
              title="Add the reference, not a guess"
              body="A manager uploads the approved PNG/JPG logo. All matching candidates refer back to these assets."
            />
          )}
          <div className="padded">
            <label className={"btn " + (!manager ? "disabled" : "")}>
              <Upload size={16} /> Upload approved asset
              <input
                type="file"
                hidden
                disabled={!manager}
                accept="image/png,image/jpeg"
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (!f) return;
                  const fd = new FormData();
                  fd.append("file", f);
                  safe(
                    () => api("/assets", "POST", fd),
                    "Approved asset saved privately. Source pack updated.",
                  );
                }}
              />
            </label>
            <p className="form-note">
              Manager only · up to 5 MB / 16 MP · activation changes the source
              version.
            </p>
          </div>
        </section>
        <section className="panel padded">
          <h2>Run a bounded check</h2>
          <Field label="Image or selected logo crop">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => sf(e.target.files?.[0] || null)}
            />
          </Field>
          <details className="advanced">
            <summary>Optional crop coordinates</summary>
            <label className="checkbox-note">
              <input
                type="checkbox"
                checked={cropOn}
                onChange={(e) => sco(e.target.checked)}
              />{" "}
              Compare only the selected rectangle
            </label>
            <div className="four-cols">
              {Object.keys(crop).map((k) => (
                <Field label={k} key={k}>
                  <input
                    type="number"
                    min="0"
                    value={(crop as any)[k]}
                    onChange={(e) =>
                      sc({ ...crop, [k]: Number(e.target.value) })
                    }
                  />
                </Field>
              ))}
            </div>
          </details>
          <div className="two-cols">
            <Field label="Image purpose">
              <select value={kind} onChange={(e) => sk(e.target.value)}>
                <option>informative</option>
                <option>decorative</option>
                <option>functional</option>
              </select>
            </Field>
            <Field
              label={
                kind === "decorative"
                  ? "Decorative image: leave alt empty"
                  : "Alt text / functional purpose"
              }
            >
              <input value={alt} onChange={(e) => sa(e.target.value)} />
            </Field>
            <Field label="Declared text foreground">
              <div className="color-input">
                <input
                  type="color"
                  value={fg}
                  onChange={(e) => sfg(e.target.value)}
                />
                <code>{fg}</code>
              </div>
            </Field>
            <Field label="Declared text background">
              <div className="color-input">
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => sbg(e.target.value)}
                />
                <code>{bg}</code>
              </div>
            </Field>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Quick WCAG presets:</span>
            <button
              type="button"
              className="text-btn"
              style={{ fontSize: "11px", background: "#f0f5f4", padding: "3px 8px", borderRadius: "5px" }}
              onClick={() => { sfg("#0f172a"); sbg("#ffffff"); }}
            >
              Navy/White (15.8:1 · AAA)
            </button>
            <button
              type="button"
              className="text-btn"
              style={{ fontSize: "11px", background: "#f0f5f4", padding: "3px 8px", borderRadius: "5px" }}
              onClick={() => { sfg("#077872"); sbg("#ffffff"); }}
            >
              Brand Teal/White (4.6:1 · AA)
            </button>
            <button
              type="button"
              className="text-btn"
              style={{ fontSize: "11px", background: "#fff7e9", color: "#816739", padding: "3px 8px", borderRadius: "5px" }}
              onClick={() => { sfg("#888888"); sbg("#ffffff"); }}
            >
              Muted Gray (3.5:1 · Large only)
            </button>
            <button
              type="button"
              className="text-btn"
              style={{ fontSize: "11px", background: "#fdebee", color: "#b54250", padding: "3px 8px", borderRadius: "5px" }}
              onClick={() => { sfg("#94a3b8"); sbg("#e2e8f0"); }}
            >
              Low Contrast (1.6:1 · Fail)
            </button>
          </div>
          <label className="checkbox-note">
            <input
              type="checkbox"
              checked={large}
              onChange={(e) => sl(e.target.checked)}
            />{" "}
            Declared large text (3:1 threshold instead of 4.5:1)
          </label>
          <Button
            variant="primary"
            disabled={!file}
            onClick={() =>
              safe(async () => {
                const fd = new FormData();
                fd.append("file", file!);
                fd.append("alt", alt);
                fd.append("imageKind", kind);
                fd.append("foreground", fg);
                fd.append("background", bg);
                fd.append("largeText", String(large));
                if (cropOn) fd.append("crop", JSON.stringify(crop));
                const r = await api("/visual-check", "POST", fd);
                sr(r);
              }, "Visual check recorded. Human logo verification is still required.")
            }
          >
            <Search size={16} /> Run image checks
          </Button>
        </section>
      </div>
      {(result || state.visualChecks.length > 0) && (
        <section className="panel padded visual-result">
          {(() => {
            const v =
              state.visualChecks.find((v: any) => v.id === result?.id) ||
              result ||
              state.visualChecks[0];
            return (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>{v.name}</h2>
                    <p>{v.logoStatus}</p>
                  </div>
                  <Badge tone={v.passed ? "green" : "amber"}>
                    {v.passed ? "Verified bounded checks" : "Needs attention"}
                  </Badge>
                </div>
                <div className="three-cols result-stats">
                  <div>
                    <span>Declared colour contrast</span>
                    <strong>{v.contrast}:1</strong>
                    <Badge tone={v.contrastPassed ? "green" : "red"}>
                      {v.contrastPassed
                        ? "Meets declared threshold"
                        : "Below " + v.threshold + ":1"}
                    </Badge>
                  </div>
                  <div>
                    <span>Alt-text presence</span>
                    <strong>
                      {v.altPassed
                        ? "Meets declared check"
                        : "Needs correction"}
                    </strong>
                    <small>
                      Purpose: {v.imageKind}. Description quality is not
                      certified.
                    </small>
                  </div>
                  <div>
                    <span>Logo review</span>
                    <strong>
                      {v.needsHumanLogoReview
                        ? "Human check required"
                        : "Verified by " + v.confirmedBy}
                    </strong>
                    <small>
                      {v.candidates[0]
                        ? `Nearest candidate: ${v.candidates[0].name}; hash distance ${v.candidates[0].distance}`
                        : "No approved reference assets yet"}
                    </small>
                  </div>
                </div>
                {["reviewer", "manager"].includes(state.actor.role) &&
                  v.needsHumanLogoReview && (
                    <div className="verification">
                      <h3>Manually verify against an approved asset</h3>
                      <div className="two-cols">
                        <Field label="Reference asset">
                          <select
                            value={aid}
                            onChange={(e) => sid(e.target.value)}
                          >
                            <option value="">Choose approved evidence</option>
                            {state.assets.map((a: any) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Verification rationale">
                          <input
                            value={reason}
                            onChange={(e) => sreason(e.target.value)}
                          />
                        </Field>
                      </div>
                      <Button
                        onClick={() =>
                          safe(
                            () =>
                              api(
                                "/visual-check/" + v.id + "/confirm",
                                "POST",
                                { assetId: aid, reason },
                              ),
                            "Manual verification recorded. Contrast/alt failures still prevent a pass.",
                          )
                        }
                      >
                        Record verification
                      </Button>
                    </div>
                  )}
                <div className="verification">
                  <h3>Attach this check to a draft</h3>
                  <p className="form-note">
                    Attaching creates a new content revision. Linked visual
                    checks participate in release eligibility.
                  </p>
                  <div className="actions">
                    <select value={did} onChange={(e) => sd(e.target.value)}>
                      <option value="">Choose your draft</option>
                      {state.documents
                        .filter((d: any) => d.creatorId === state.actor.id)
                        .map((d: any) => (
                          <option key={d.id} value={d.id}>
                            {d.title}
                          </option>
                        ))}
                    </select>
                    <Button
                      disabled={!did}
                      onClick={() =>
                        safe(
                          () =>
                            api("/documents/" + did + "/link-visual", "POST", {
                              visualId: v.id,
                              expectedRevision: state.documents.find(
                                (d: any) => d.id === did,
                              )?.revision,
                            }),
                          "Visual evidence linked; review the new draft revision.",
                        )
                      }
                    >
                      Link evidence
                    </Button>
                  </div>
                </div>
                <p className="form-note">{v.note}</p>
              </>
            );
          })()}
        </section>
      )}
    </>
  );
}

function Insights({ state, open }: any) {
  const counts: any = {};
  state.documents.forEach((d: any) =>
    d.findings.forEach((f: any) => {
      counts[f.ruleId] ??= { name: f.ruleName, count: 0, contested: 0 };
      counts[f.ruleId].count++;
      if (f.status === "contested") counts[f.ruleId].contested++;
    }),
  );
  const rows: any[] = Object.values(counts);
  const max = Math.max(...rows.map((x) => x.count), 1);
  return (
    <>
      <PageTitle
        eyebrow="GOVERNANCE INSIGHTS"
        title="Improve the rule, not just the draft."
        body="Observed findings and human feedback. No fabricated analytics, employee rankings or automatic retraining."
      />
      <div className="stats-grid">
        <Stat
          label="Recorded review runs"
          value={
            state.jobs.filter((j: any) =>
              ["partial", "complete"].includes(j.status),
            ).length
          }
          icon={Search}
          note="Actual jobs in this workspace"
        />
        <Stat
          label="Current findings"
          value={rows.reduce((a, b) => a + b.count, 0)}
          icon={AlertTriangle}
          note="Latest document results"
        />
        <Stat
          label="Resolution feedback"
          value={state.feedback.length}
          icon={MessageSquare}
          note="Human-entered reasons"
        />
        <Stat
          label="Consistency advisories"
          value={state.conflicts.length}
          icon={GitCompareArrows}
          note="Requires context-aware inspection"
        />
      </div>
      <div className="two-cols">
        <section className="panel">
          <div className="panel-heading">
            <h2>Rule Clarity Report</h2>
            <Badge>OBSERVED COUNTS</Badge>
          </div>
          <div className="padded">
            {rows.length ? (
              rows
                .sort((a, b) => b.count - a.count)
                .map((x) => (
                  <div className="bar-row" key={x.name}>
                    <div>
                      <strong>{x.name}</strong>
                      <span>
                        {x.count} finding(s) · {x.contested} contested
                      </span>
                    </div>
                    <div className="bar-track">
                      <span style={{ width: (x.count / max) * 100 + "%" }} />
                    </div>
                  </div>
                ))
            ) : (
              <Empty
                icon={BarChart3}
                title="Run a review to start learning"
                body="This report is calculated from actual findings, not pre-populated percentages."
              />
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Source & cross-document consistency</h2>
          </div>
          <div className="padded">
            {state.conflicts.length ? (
              state.conflicts.map((x: any, i: number) => (
                <div className="lab-finding" key={i}>
                  <Badge tone="amber">Advisory · {x.kind}</Badge>
                  <h3>{x.title}</h3>
                  <p>{x.detail}</p>
                </div>
              ))
            ) : (
              <Empty
                icon={CheckCircle2}
                title="No configured conflicts surfaced"
                body="The check is bounded to configured fact keys and numeric differences in matching declared contexts. This does not prove all documents are consistent."
              />
            )}
          </div>
        </section>
      </div>
      <section className="panel feedback-list">
        <div className="panel-heading">
          <h2>Finding-resolution feedback</h2>
          <p>
            Only a manager should decide whether evidence or rules need
            changing.
          </p>
        </div>
        {state.feedback.length ? (
          state.feedback.map((f: any) => (
            <div className="feedback-row" key={f.id}>
              <div>
                <strong>{f.ruleName}</strong>
                <p>{f.reason}</p>
                <small>
                  {f.by} · {fmt(f.at)}
                </small>
              </div>
              <Badge>{f.outcome.replaceAll("_", " ")}</Badge>
              <button
                className="icon-btn"
                onClick={() => open(f.documentId)}
                aria-label="Open related content"
              >
                <ArrowUpRight size={17} />
              </button>
            </div>
          ))
        ) : (
          <div className="padded muted">
            No feedback yet. Contest or resolve a finding from its document.
          </div>
        )}
      </section>
    </>
  );
}

function Campaigns({ state, safe, download, open }: any) {
  const [name, sn] = useState(""),
    [ids, si] = useState<string[]>([]);
  return (
    <>
      <PageTitle
        eyebrow="CAMPAIGN BUNDLES"
        title="A consistent story, across every piece."
        body="Group related documents. Export a versioned manifest only when every item has a current eligible approval."
      />
      <section className="panel padded">
        <h2>Create a release bundle</h2>
        <Field label="Campaign name">
          <input
            placeholder="e.g. Annual plan launch"
            value={name}
            onChange={(e) => sn(e.target.value)}
          />
        </Field>
        <div className="bundle-options">
          {state.documents.map((d: any) => (
            <label key={d.id}>
              <input
                type="checkbox"
                checked={ids.includes(d.id)}
                onChange={(ev) =>
                  si(
                    ev.target.checked
                      ? [...ids, d.id]
                      : ids.filter((x) => x !== d.id),
                  )
                }
              />
              <span>{d.title}</span>
              <Status value={d.status} />
            </label>
          ))}
        </div>
        <Button
          variant="primary"
          disabled={state.actor.role !== "manager" || !name || !ids.length}
          onClick={() =>
            safe(async () => {
              await api("/campaigns", "POST", { name, documentIds: ids });
              sn("");
              si([]);
            }, "Campaign saved with actual document references.")
          }
        >
          <Layers size={16} /> Create bundle
        </Button>
        {state.actor.role !== "manager" && (
          <p className="form-note">
            A manager creates bundles; all members can inspect release
            readiness.
          </p>
        )}
      </section>
      <div className="campaign-grid">
        {state.campaigns.map((c: any) => (
          <section className="panel padded" key={c.id}>
            <div className="campaign-icon">
              <Layers size={24} />
            </div>
            <h2>{c.name}</h2>
            <p className="muted">
              {c.documentIds.length} content items · created {fmt(c.createdAt)}
            </p>
            {c.documentIds.map((id: string) => {
              const d = state.documents.find((d: any) => d.id === id);
              return (
                d && (
                  <button
                    className="bundle-doc"
                    key={id}
                    onClick={() => open(id)}
                  >
                    <FileText size={16} />
                    <span>{d.title}</span>
                    <Status value={d.status} />
                  </button>
                )
              );
            })}
            <Button
              onClick={() =>
                download(
                  "/campaigns/" + c.id + "/export",
                  "proofline-campaign-manifest.json",
                )
              }
            >
              <Download size={16} /> Export eligible bundle
            </Button>
            <p className="form-note">
              The server checks each exact version. One stale or incomplete item
              blocks the bundle.
            </p>
          </section>
        ))}
      </div>
    </>
  );
}

function SettingsView({ config, state, safe, start }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [memberInput, setMemberInput] = useState("");
  const [memberRole, setMemberRole] = useState("reviewer");
  const loadMembers = async () => {
    try {
      setMembers(await api("/members"));
    } catch {
      setMembers([]);
    }
  };
  useEffect(() => {
    if (state.actor.role === "manager" && state.mode !== "demo")
      loadMembers().catch(() => {});
  }, [state.workspaceId, state.actor.role]);
  const [uid, su] = useState(""),
    [name, sn] = useState(""),
    [role, sr] = useState("reviewer");
  return (
    <>
      <PageTitle
        eyebrow="CONNECTIONS & SETTINGS"
        title="Transparent by design."
        body="Configuration status is real. Secrets stay on the server and are never displayed here."
      />
      <div className="two-cols">
        <section className="panel padded">
          <div className="connection-heading">
            <BookOpen size={24} />
            <h2>Supabase</h2>
            <Badge tone={config?.supabaseConfigured ? "green" : "amber"}>
              {config?.supabaseConfigured
                ? "Configured · verify integration"
                : "Not connected"}
            </Badge>
          </div>
          <p>
            Real workspaces use Supabase Auth, a private Postgres workspace
            state and private Storage. Workspace data is decoupled and does not
            silently stand in for Supabase.
          </p>
          <div className="setup-list">
            <div>
              <span>1</span> Connect your Supabase project through Apps.
            </div>
            <div>
              <span>2</span> Review and apply{" "}
              <code>supabase/001_proofline.sql</code>.
            </div>
            <div>
              <span>3</span> Configure URL, anon key and server-only service
              key.
            </div>
            <div>
              <span>4</span> Restart API and execute real role / RLS / storage
              tests.
            </div>
          </div>
          <p className="form-note">
            Do not paste service keys or passwords into chat. Configuration
            present is not proof that production integration tests have passed.
          </p>
        </section>
        <section className="panel padded">
          <div className="connection-heading">
            <Sparkles size={24} />
            <h2>Contextual AI</h2>
            <Badge tone={config?.aiConfigured ? "green" : "amber"}>
              {config?.aiConfigured ? "Key configured" : "Not configured"}
            </Badge>
          </div>
          <p>
            {config?.aiConfigured
              ? "Configured model: " + config.model
              : "No model results are fabricated. Rule-based review and explicit human semantic review remain available."}
          </p>
          <ul className="plain-list">
            <li>Opt-in per review, with consent recorded.</li>
            <li>At most five bounded approved passages.</li>
            <li>Structured output and exact quote validation.</li>
            <li>One retry; honest partial coverage on failure.</li>
            <li>Potential credentials block external AI processing.</li>
          </ul>
          <p className="form-note">
            Provider geography/retention and account terms must be reviewed
            before confidential use. Request limits are guardrails, not a
            privacy certification.
          </p>
        </section>
      </div>
      <section className="panel padded">
        <h2>Workspace access</h2>
        <p>
          Signed in as <strong>{state.actor.role}</strong> in{" "}
          {state.mode === "supabase"
            ? "a hosted Supabase workspace"
            : state.mode === "local"
              ? "a local development workspace"
              : "an active governance workspace"}
          . Identity: <code>{String(state.actor.id).slice(0, 8)}…</code>
        </p>
        {state.mode === "demo" ? (
          <div className="callout amber">
            <Info size={19} /> Multi-operator role switching is active. Switch roles in the topbar between Creator, Manager, and Reviewer to test separation-of-duties governance.
          </div>
        ) : (
          <>
            <div className="member-list">
              {members.map((m: any) => (
                <div className="member-row" key={m.id}>
                  <span className="avatar">
                    {String(m.name || "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <strong>{m.name}</strong>
                    <small>{m.email || `${String(m.id).slice(0, 8)}…`}</small>
                  </div>
                  <Badge>{m.role}</Badge>
                </div>
              ))}
              {!members.length && <p className="muted">Loading members…</p>}
            </div>
            {state.actor.role === "manager" && (
              <>
                <p className="form-note">
                  Both people create an account first. Then add the second account
                  here as <strong>reviewer</strong>: that person signs in with their
                  own identity and approves, because you cannot approve your own
                  content.
                </p>
                <div className="two-cols">
                  <Field
                    label={
                      state.mode === "local"
                        ? "Registered email"
                        : "Registered user UUID"
                    }
                  >
                    <input
                      value={memberInput}
                      onChange={(e) => setMemberInput(e.target.value)}
                      placeholder={
                        state.mode === "local"
                          ? "reviewer@example.com"
                          : "00000000-0000-0000-0000-000000000000"
                      }
                    />
                  </Field>
                  <Field label="Role">
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value)}
                    >
                      {["reviewer", "creator", "manager"].map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Button
                  onClick={() =>
                    safe(async () => {
                      await api(
                        "/members",
                        "POST",
                        state.mode === "local"
                          ? { email: memberInput, role: memberRole }
                          : { userId: memberInput, role: memberRole },
                      );
                      setMemberInput("");
                      await loadMembers();
                    }, "Membership assigned. That person can now sign in with their own identity.")
                  }
                >
                  <Plus size={15} /> Assign membership
                </Button>
              </>
            )}
          </>
        )}
      </section>
      <section className="panel padded">
        <h2>Original uploads</h2>
        <p className="form-note">
          Deleting an original does not automatically delete separately saved
          draft text. Provider backups can follow separate retention.
        </p>
        {(state.files || []).length ? (
          state.files.map((f: any) => (
            <div className="mini-row" key={f.id}>
              <span>{f.name}</span>
              <Button
                onClick={() =>
                  safe(
                    () => api("/files/" + f.id, "DELETE"),
                    "Original upload deleted; review separately stored draft text if required.",
                  )
                }
              >
                <Trash2 size={14} /> Delete original
              </Button>
            </div>
          ))
        ) : (
          <p className="muted">
            No original text/PDF uploads in this workspace.
          </p>
        )}
      </section>
      <section className="panel padded">
        <h2>Reset workspace state</h2>
        <p>
          Initializes a fresh workspace session with default governance rules and baseline knowledge packs.
        </p>
        <Button onClick={start}>
          <RefreshCw size={16} /> Reset workspace
        </Button>
      </section>
    </>
  );
}
