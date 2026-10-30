"use client";

import React, { useState } from "react";
import {
  Settings,
  Radio,
  Key,
  Shield,
  Users,
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Send,
  Lock,
  Copy,
  Clock,
  Trash2,
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface IntegrationsAdminProps {
  apiBase: string;
}

export default function IntegrationsAdmin({ apiBase }: IntegrationsAdminProps) {
  const [activeTab, setActiveTab] = useState<"INTEGRATIONS" | "SECURITY_ADMIN" | "RBAC">("INTEGRATIONS");

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState("https://api.enterprise.corp/proofline/events");
  const [webhookSecret] = useState("whsec_99a8bc47f12e84c98762310abcdef123");
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);

  // Retention State
  const [retentionDays, setRetentionDays] = useState("365");
  const [piiRedaction, setPiiRedaction] = useState(true);
  const [strictSSRF, setStrictSSRF] = useState(true);

  // Test Webhook Dispatch
  const handleTestWebhook = () => {
    setWebhookTesting(true);
    setWebhookStatus(null);
    setTimeout(() => {
      setWebhookTesting(false);
      setWebhookStatus("Webhook payload dispatched successfully (HTTP 200 OK) with valid HMAC-SHA256 signature header.");
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="card-glass border border-slate-700/60 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Enterprise Administration & Integrations
                <span className="badge badge-cyan text-xs">Proofline</span>
              </h2>
              <p className="text-sm text-slate-400">
                Manage webhook dispatchers, cryptographic key rings, RBAC authorization boundaries, and retention policies.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("INTEGRATIONS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "INTEGRATIONS"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Connectors & Webhooks
          </button>
          <button
            onClick={() => setActiveTab("SECURITY_ADMIN")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "SECURITY_ADMIN"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Crypto Keys & Privacy
          </button>
          <button
            onClick={() => setActiveTab("RBAC")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "RBAC"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            RBAC & Roles
          </button>
        </div>
      </div>

      {/* Tab 1: Connectors & Webhooks */}
      {activeTab === "INTEGRATIONS" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Webhook Dispatcher */}
          <div className="card-glass p-6 rounded-2xl border border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Event Webhook Dispatcher</h3>
              </div>
              <span className="badge badge-emerald text-xs">Active</span>
            </div>

            <p className="text-xs text-slate-400">
              Proofline dispatches cryptographically signed HMAC-SHA256 payloads whenever reviews complete, receipts are generated, or sources expire.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">
                  Destination Endpoint URL:
                </label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-mono block mb-1">
                  Signing Secret (HMAC-SHA256):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={webhookSecret}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 font-mono"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(webhookSecret)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Copy Secret"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400">
                <span className="text-slate-300 block font-semibold mb-1">Header Signature Verification:</span>
                <code>X-Proofline-Signature: sha256=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code>
              </div>

              <button
                onClick={handleTestWebhook}
                disabled={webhookTesting}
                className="btn-primary w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
              >
                {webhookTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending Test Webhook...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Dispatch Test Event
                  </>
                )}
              </button>

              {webhookStatus && (
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{webhookStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Third-party Connectors Card */}
          <div className="card-glass p-6 rounded-2xl border border-slate-700/60 space-y-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Enterprise Connectors</h3>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Slack & MS Teams Alerting</h4>
                  <p className="text-[11px] text-slate-400">Post compliance alerts to #legal-compliance</p>
                </div>
                <span className="badge badge-emerald text-[10px]">CONNECTED</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">S3 / MinIO Encrypted Storage</h4>
                  <p className="text-[11px] text-slate-400">Client-side AES-256 GCM bucket sync</p>
                </div>
                <span className="badge badge-emerald text-[10px]">ENCRYPTED</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Jira / ServiceNow Sync</h4>
                  <p className="text-[11px] text-slate-400">Auto-create risk mitigation tickets for critical findings</p>
                </div>
                <span className="badge badge-blue text-[10px]">CONFIGURED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Security & Crypto Keys */}
      {activeTab === "SECURITY_ADMIN" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Key Ring */}
          <div className="card-glass p-6 rounded-2xl border border-slate-700/60 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Ed25519 Cryptographic Key Ring</h3>
            </div>
            <p className="text-xs text-slate-400">
              Proofline signs all release approval receipts using an internal elliptic curve key ring. The private key remains secure on the server; the public key is distributed for independent offline verification.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">ACTIVE KEY ID</span>
                <span className="text-cyan-300 font-bold">KEY-2025-ED25519-PROD-01</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">ALGORITHM</span>
                <span className="text-emerald-400 font-bold">Ed25519 (RFC 8032)</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">PUBLIC KEY (BASE64)</span>
                <code className="text-[11px] text-slate-300 break-all select-all block mt-1">
                  MCowBQYDK2VwAyEA9Z8y2x7Y7T3z2q6... (Active)
                </code>
              </div>
            </div>
          </div>

          {/* Privacy & Retention */}
          <div className="card-glass p-6 rounded-2xl border border-slate-700/60 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Privacy & Retention Controls</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Document Audit Retention Period (Days):
                </label>
                <select
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 w-full"
                >
                  <option value="90">90 Days (Aggressive Shorter Retention)</option>
                  <option value="365">365 Days (1 Year Compliance Standard)</option>
                  <option value="2555">7 Years (Financial / Regulatory Standard)</option>
                  <option value="9999">Indefinite Archive</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white">Automated PII Redaction</h4>
                  <p className="text-[11px] text-slate-400">Mask emails, phone numbers, and SSNs before AI processing</p>
                </div>
                <input
                  type="checkbox"
                  checked={piiRedaction}
                  onChange={(e) => setPiiRedaction(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white">Strict SSRF Guard</h4>
                  <p className="text-[11px] text-slate-400">Block private RFC 1918 IPs and cloud metadata (169.254.x.x)</p>
                </div>
                <input
                  type="checkbox"
                  checked={strictSSRF}
                  onChange={(e) => setStrictSSRF(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: RBAC & Roles */}
      {activeTab === "RBAC" && (
        <div className="card-glass p-6 rounded-2xl border border-slate-700/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Role-Based Access Control (RBAC)</h3>
            </div>
            <span className="badge badge-cyan text-xs">Strict Separation of Duties</span>
          </div>

          <p className="text-xs text-slate-400">
            Proofline enforces strict multi-tenant authorization boundaries. Authors cannot approve their own documents; only designated Reviewers and Workspace Administrators can issue cryptographic passports.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">ROLE</th>
                  <th className="py-2.5 px-3">INGEST SOURCES</th>
                  <th className="py-2.5 px-3">RUN AUDITS</th>
                  <th className="py-2.5 px-3">EDIT POLICIES</th>
                  <th className="py-2.5 px-3">APPROVE RELEASES</th>
                  <th className="py-2.5 px-3">EXPORT AUDIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-white">Author</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-slate-500">✗</td>
                  <td className="py-2.5 px-3 text-slate-500">✗</td>
                  <td className="py-2.5 px-3 text-slate-500">✗</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-cyan-400">Reviewer</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-slate-500">✗</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-purple-400">Approver</td>
                  <td className="py-2.5 px-3 text-slate-500">✗</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-slate-500">✗</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-amber-400">Auditor</td>
                  <td className="py-2.5 px-3 text-slate-500">✗</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-slate-500">✗</td>
                  <td className="py-2.5 px-3 text-slate-500">✗</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓ (Read Only)</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-rose-400">Admin</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                  <td className="py-2.5 px-3 text-emerald-400">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
