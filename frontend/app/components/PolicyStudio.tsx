"use client";

import React, { useState } from "react";
import {
  FileCode,
  Plus,
  Play,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  History,
  Shield,
  Layers,
  ArrowRight,
  Filter,
  RefreshCw,
  Copy
} from "lucide-react";

interface Rule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  enabled: boolean;
  version: string;
  deterministic: boolean;
  pattern?: string;
  requiredEvidence?: string;
  testCases?: Array<{ input: string; expected: boolean }>;
}

interface PolicyStudioProps {
  apiBase: string;
  initialRules?: Rule[];
}

export default function PolicyStudio({ apiBase }: PolicyStudioProps) {
  // Built-in rules from Proofline 2.0
  const [rules, setRules] = useState<Rule[]>([
    {
      id: "RULE-001",
      name: "Mandatory Regulatory Disclaimer",
      description: "Any financial, medical, or legal assertion must include unambiguous jurisdictional disclaimers.",
      category: "Required disclosure",
      severity: "CRITICAL",
      enabled: true,
      version: "2.1.0",
      deterministic: true,
      pattern: "(disclaimer|not financial advice|past performance)",
      requiredEvidence: "Official Regulatory Filing or SEC Disclaimer Catalog",
    },
    {
      id: "RULE-002",
      name: "Absolute Superlative Prohibition",
      description: "Prohibits unsubstantiated superlatives (e.g., '100% unbreakable', 'zero latency') without authoritative benchmarks.",
      category: "Prohibited claims",
      severity: "HIGH",
      enabled: true,
      version: "1.4.0",
      deterministic: true,
      pattern: "(100%|guaranteed|zero risk|flawless|unbreakable)",
      requiredEvidence: "Independent Lab Benchmark Audit Report",
    },
    {
      id: "RULE-003",
      name: "Numerical SLA & Availability Threshold",
      description: "Uptime or latency percentages must be backed by live telemetry and approved SLA contracts.",
      category: "Numerical thresholds",
      severity: "HIGH",
      enabled: true,
      version: "2.0.0",
      deterministic: true,
      pattern: "(\\d{2,3}\\.\\d{1,4}%|99\\.\\d+%)",
      requiredEvidence: "Audited SOC-2 Type II System Performance Log",
    },
    {
      id: "RULE-004",
      name: "Active Certification Verification",
      description: "Any claim of ISO-27001, SOC-2, or HIPAA compliance must reference an active, non-expired certificate.",
      category: "Certification requirements",
      severity: "CRITICAL",
      enabled: true,
      version: "3.0.1",
      deterministic: true,
      pattern: "(SOC-2|ISO-27001|HIPAA|FedRAMP)",
      requiredEvidence: "Current Certificate of Compliance with Expiry > Current Date",
    },
    {
      id: "RULE-005",
      name: "Verified Pricing & Currency Integrity",
      description: "Subscription pricing, tier costs, and currency figures must match the authorized master price schedule.",
      category: "Pricing and availability",
      severity: "MEDIUM",
      enabled: true,
      version: "1.1.0",
      deterministic: true,
      pattern: "(\\$[0-9]+(\\.[0-9]{2})?|pricing|per month)",
      requiredEvidence: "Master Enterprise Pricing Schedule (Current Quarter)",
    },
    {
      id: "RULE-006",
      name: "Source Freshness & Deprecation Guard",
      description: "Evidence older than 365 days triggers mandatory revalidation warning.",
      category: "Source freshness",
      severity: "MEDIUM",
      enabled: true,
      version: "1.0.0",
      deterministic: true,
      pattern: "(dated|issued|effective)",
      requiredEvidence: "Active Document with Valid Effective Date Range",
    },
    {
      id: "RULE-007",
      name: "Adversarial Prompt Injection Boundary",
      description: "Detects and neutralizes malicious meta-instructions inside ingested documents.",
      category: "AI safety & security",
      severity: "CRITICAL",
      enabled: true,
      version: "2.5.0",
      deterministic: true,
      pattern: "(ignore all previous|system override|you are now|bypass policy)",
      requiredEvidence: "Document Security Quarantine Log",
    },
  ]);

  const [selectedRule, setSelectedRule] = useState<Rule>(rules[0]);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sandbox Tester State
  const [testText, setTestText] = useState(
    "Our enterprise cloud provides 99.99% uptime with SOC-2 certification and 100% guaranteed security."
  );
  const [testResult, setTestResult] = useState<{
    matched: boolean;
    findings: string[];
    riskScore: number;
  } | null>(null);

  // NL Builder State
  const [showNLModal, setShowNLModal] = useState(false);
  const [nlDescription, setNlDescription] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlGeneratedRule, setNlGeneratedRule] = useState<any | null>(null);
  const [nlError, setNlError] = useState<string | null>(null);

  const categories = [
    "ALL",
    "Required disclosure",
    "Prohibited claims",
    "Numerical thresholds",
    "Certification requirements",
    "Pricing and availability",
    "Source freshness",
    "AI safety & security",
  ];

  const filteredRules = rules.filter((r) => {
    const matchCat = filterCategory === "ALL" || r.category === filterCategory;
    const matchQuery =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  const runSandboxTest = () => {
    if (!testText.trim()) return;
    const findings: string[] = [];
    let risk = 10;

    // Evaluate active enabled rules against testText
    rules.forEach((rule) => {
      if (!rule.enabled) return;
      if (rule.pattern) {
        try {
          const re = new RegExp(rule.pattern, "i");
          if (re.test(testText)) {
            findings.push(`[${rule.id}] ${rule.name}: Matched pattern "${rule.pattern}"`);
            if (rule.severity === "CRITICAL") risk += 35;
            else if (rule.severity === "HIGH") risk += 20;
            else if (rule.severity === "MEDIUM") risk += 10;
          }
        } catch {
          // ignore regex errors
        }
      }
    });

    setTestResult({
      matched: findings.length > 0,
      findings,
      riskScore: Math.min(risk, 100),
    });
  };

  const handleBuildNL = async () => {
    if (!nlDescription.trim()) return;
    setNlLoading(true);
    setNlError(null);
    try {
      const res = await fetch(`${apiBase}/api/policies/build-nl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: nlDescription }),
      });
      if (!res.ok) throw new Error("Failed to compile natural language policy");
      const json = await res.json();
      setNlGeneratedRule(json.proposedRule);
    } catch (err: any) {
      setNlError(err.message || "Failed to generate policy");
    } finally {
      setNlLoading(false);
    }
  };

  const handleActivateNLRule = () => {
    if (!nlGeneratedRule) return;
    const newRule: Rule = {
      id: nlGeneratedRule.ruleId || `RULE-00${rules.length + 1}`,
      name: nlGeneratedRule.name || "Custom NL Policy",
      description: nlGeneratedRule.description || nlDescription,
      category: nlGeneratedRule.category || "Required disclosure",
      severity: nlGeneratedRule.severity || "HIGH",
      enabled: true,
      version: "1.0.0",
      deterministic: true,
      pattern: nlGeneratedRule.evaluationLogic || "",
      requiredEvidence: nlGeneratedRule.requiredEvidence || "Authoritative Audit Evidence",
    };
    setRules([newRule, ...rules]);
    setSelectedRule(newRule);
    setShowNLModal(false);
    setNlGeneratedRule(null);
    setNlDescription("");
  };

  const toggleRuleEnabled = (id: string) => {
    setRules(
      rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    if (selectedRule.id === id) {
      setSelectedRule({ ...selectedRule, enabled: !selectedRule.enabled });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="card-glass border border-slate-700/60 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Deterministic Policy Studio
                <span className="badge badge-cyan text-xs">v2.0 Rule Engine</span>
              </h2>
              <p className="text-sm text-slate-400">
                Configure deterministic compliance boundaries, simulate edge cases, or synthesize new rules with Natural Language.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNLModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-purple-500/20"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            AI Policy Builder
          </button>
        </div>
      </div>

      {/* Main Grid: Rules List on Left, Detail & Sandbox on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rule Explorer (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="card-glass p-4 rounded-xl border border-slate-700/50 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search rule ID, title, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1">
              {categories.slice(0, 5).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
                    filterCategory === cat
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-800/40 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                onClick={() => setSelectedRule(rule)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedRule.id === rule.id
                    ? "bg-cyan-950/20 border-cyan-500/50 shadow-md shadow-cyan-950/50"
                    : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      {rule.id}
                    </span>
                    <span
                      className={`badge text-[10px] ${
                        rule.severity === "CRITICAL"
                          ? "badge-rose"
                          : rule.severity === "HIGH"
                          ? "badge-amber"
                          : "badge-blue"
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      rule.enabled
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {rule.enabled ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mt-1.5">{rule.name}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{rule.description}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>{rule.category}</span>
                  <span>v{rule.version}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Selected Rule Inspector & Sandbox Tester (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Rule Inspector Card */}
          <div className="card-glass p-6 rounded-2xl border border-slate-700/60 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-cyan-400">
                    {selectedRule.id}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Revision v{selectedRule.version}
                  </span>
                  <span
                    className={`badge text-xs ${
                      selectedRule.severity === "CRITICAL"
                        ? "badge-rose"
                        : "badge-amber"
                    }`}
                  >
                    {selectedRule.severity}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{selectedRule.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedRule.category}</p>
              </div>

              <button
                onClick={() => toggleRuleEnabled(selectedRule.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                  selectedRule.enabled
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                }`}
              >
                {selectedRule.enabled ? "Disable Rule" : "Activate Rule"}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-cyan-300 block mb-1">Policy Description:</span>
              {selectedRule.description}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-slate-400 font-mono block text-[10px]">EVALUATION ENGINE</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Deterministic Regex Engine
                </span>
                <code className="text-[11px] font-mono text-cyan-300 mt-1 block truncate">
                  {selectedRule.pattern || "N/A"}
                </code>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-slate-400 font-mono block text-[10px]">REQUIRED EVIDENCE</span>
                <span className="font-semibold text-slate-200 block mt-1">
                  {selectedRule.requiredEvidence || "Any Verified Source"}
                </span>
              </div>
            </div>
          </div>

          {/* Live Sandbox Tester */}
          <div className="card-glass p-6 rounded-2xl border border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Live Policy Sandbox Tester</h4>
              </div>
              <span className="text-xs text-slate-400">Evaluates active rule engine</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Sample Claim Text to Validate:
              </label>
              <textarea
                rows={3}
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/70 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                placeholder="Enter sample text with metrics, SLA, or certifications..."
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={runSandboxTest}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" /> Execute Sandbox Match
              </button>
            </div>

            {testResult && (
              <div
                className={`p-4 rounded-xl border ${
                  testResult.matched
                    ? "bg-amber-950/20 border-amber-500/40 text-amber-200"
                    : "bg-emerald-950/20 border-emerald-500/40 text-emerald-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    {testResult.matched ? (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        {testResult.findings.length} Policy Trigger(s) Detected
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        No Policy Violations in Sample
                      </>
                    )}
                  </span>
                  <span className="font-mono text-xs font-bold">
                    Risk Score: {testResult.riskScore}/100
                  </span>
                </div>

                {testResult.findings.length > 0 && (
                  <ul className="space-y-1 text-xs text-slate-300 font-mono pl-4 list-disc">
                    {testResult.findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Natural Language Policy Builder Modal */}
      {showNLModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-glass border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">
                  Natural Language Policy Builder
                </h3>
              </div>
              <button
                onClick={() => setShowNLModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Describe your organizational compliance rule in plain conversational English. Proofline will extract applicability boundaries, regex patterns, required evidence, and edge cases.
            </p>

            <div>
              <label className="text-xs text-slate-300 block mb-1 font-semibold">
                Rule Intent Description:
              </label>
              <textarea
                rows={3}
                value={nlDescription}
                onChange={(e) => setNlDescription(e.target.value)}
                placeholder="e.g. Any mention of medical or HIPAA compliance requires SOC-2 Type II audit evidence and cannot make absolute cure guarantees..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            {nlError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {nlError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNLModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleBuildNL}
                disabled={nlLoading || !nlDescription.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2"
              >
                {nlLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Synthesize Rule
                  </>
                )}
              </button>
            </div>

            {nlGeneratedRule && (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/40 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 font-mono">
                    Proposed: {nlGeneratedRule.ruleId}
                  </span>
                  <span className="badge badge-purple text-xs">
                    {nlGeneratedRule.severity}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{nlGeneratedRule.name}</h4>
                <p className="text-xs text-slate-300">{nlGeneratedRule.description}</p>
                <div className="text-[11px] font-mono text-slate-400 space-y-1">
                  <div>
                    <strong className="text-slate-300">Category:</strong> {nlGeneratedRule.category}
                  </div>
                  <div>
                    <strong className="text-slate-300">Regex Logic:</strong>{" "}
                    <code>{nlGeneratedRule.evaluationLogic}</code>
                  </div>
                  <div>
                    <strong className="text-slate-300">Required Evidence:</strong>{" "}
                    {nlGeneratedRule.requiredEvidence}
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-900/50 flex justify-end gap-2">
                  <button
                    onClick={handleActivateNLRule}
                    className="btn-primary px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Activate to Production
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
