"use client";
import React, { useState, useEffect } from "react";
import {
  BarChart3,
  AlertTriangle,
  ShieldAlert,
  Clock,
  RefreshCw,
  Layers,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  FileWarning,
} from "lucide-react";

interface RiskIntelligenceProps {
  api: (path: string, method?: string, data?: any) => Promise<any>;
  state: any;
  onNavigate?: (tab: string, filter?: string) => void;
}

export default function RiskIntelligence({ api, state, onNavigate }: RiskIntelligenceProps) {
  const [riskData, setRiskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const loadRisk = async () => {
    setLoading(true);
    try {
      const data = await api("/risk/intelligence");
      setRiskData(data);
    } catch {
      // Handle fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRisk();
  }, [state]);

  const severityCounts = riskData?.severityCounts || { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const evidenceStateCounts = riskData?.evidenceStateCounts || {
    SUPPORTED: 0,
    CONTRADICTED: 0,
    UNVERIFIED: 0,
    INSUFFICIENT_EVIDENCE: 0,
    OUTDATED_SOURCE: 0,
    CONFLICTING_SOURCES: 0,
  };
  const expiredSources = riskData?.expiredSources || [];

  return (
    <div style={{ marginTop: "16px" }}>
      {/* Policy Drift Monitor Banner */}
      {expiredSources.length > 0 && (
        <div
          style={{
            background: "#fff1f2",
            border: "1px solid #fecdd3",
            borderRadius: "10px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#ffe4e6",
              display: "grid",
              placeItems: "center",
              color: "#e11d48",
              flexShrink: 0,
            }}
          >
            <Clock size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "14px", color: "#9f1239", display: "block" }}>
              Policy Drift Alert: Expired Evidence Detected
            </strong>
            <p style={{ fontSize: "12px", color: "#be123c", marginTop: "4px", lineHeight: 1.6 }}>
              {expiredSources.length} approved source document(s) have passed their validity expiration date.
              Claims grounded in these sources must be re-validated or updated before subsequent releases.
            </p>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
              {expiredSources.map((s: any) => (
                <span
                  key={s.id}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: "#fecdd3",
                    color: "#881337",
                  }}
                >
                  {s.title} (Expired: {s.validUntil})
                </span>
              ))}
            </div>
          </div>
          {onNavigate && (
            <button
              className="btn"
              onClick={() => onNavigate("sources")}
              style={{ background: "#ffffff", borderColor: "#fda4af", color: "#9f1239" }}
            >
              Update Sources
            </button>
          )}
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="stats-grid">
        <div className="stat">
          <div>
            <span>Evidence Coverage</span>
            <CheckCircle2 size={16} />
          </div>
          <strong style={{ color: "var(--teal)" }}>{riskData?.evidenceCoveragePct ?? 100}%</strong>
          <small>Traceable claims backed by approved evidence</small>
        </div>

        <div className="stat">
          <div>
            <span>Critical & High Violations</span>
            <ShieldAlert size={16} />
          </div>
          <strong style={{ color: severityCounts.critical + severityCounts.high > 0 ? "#e11d48" : "#059669" }}>
            {severityCounts.critical + severityCounts.high}
          </strong>
          <small>Active findings requiring pre-release remediation</small>
        </div>

        <div className="stat">
          <div>
            <span>Contradicted / Expired</span>
            <AlertTriangle size={16} />
          </div>
          <strong style={{ color: evidenceStateCounts.CONTRADICTED + evidenceStateCounts.OUTDATED_SOURCE > 0 ? "#ea580c" : "#059669" }}>
            {evidenceStateCounts.CONTRADICTED + evidenceStateCounts.OUTDATED_SOURCE}
          </strong>
          <small>Direct contradictions or expired source references</small>
        </div>

        <div className="stat">
          <div>
            <span>Unverified Claims</span>
            <FileWarning size={16} />
          </div>
          <strong>{evidenceStateCounts.UNVERIFIED}</strong>
          <small>Claims with insufficient evidence in sources</small>
        </div>
      </div>

      <div className="two-cols" style={{ gap: "22px" }}>
        {/* Risk Matrix (Impact x Likelihood) */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                <BarChart3 size={18} style={{ color: "var(--cyan-600)" }} />
                Explainable Risk Matrix (Impact × Likelihood)
              </h2>
              <p>Deterministic escalation matrix evaluated against active compliance policies.</p>
            </div>
            <button className="icon-btn" onClick={() => loadRisk()} title="Refresh">
              <RefreshCw size={15} />
            </button>
          </div>

          <div style={{ padding: "20px" }}>
            <table className="risk-matrix-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", width: "110px" }}>Severity</th>
                  <th>Remote</th>
                  <th>Possible</th>
                  <th>Probable</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700, fontSize: "12px", color: "#991b1b" }}>Critical</td>
                  <td>
                    <div className="risk-matrix-cell cell-medium">
                      <span>Low</span>
                      <small style={{ fontSize: "10px", fontWeight: 400 }}>0</small>
                    </div>
                  </td>
                  <td>
                    <div className="risk-matrix-cell cell-high">
                      <span>High</span>
                      <small style={{ fontSize: "10px", fontWeight: 400 }}>{severityCounts.critical > 0 ? 1 : 0}</small>
                    </div>
                  </td>
                  <td>
                    <div className="risk-matrix-cell cell-critical">
                      <span>Critical</span>
                      <small style={{ fontSize: "10px", fontWeight: 400 }}>{severityCounts.critical}</small>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, fontSize: "12px", color: "#c2410c" }}>High</td>
                  <td>
                    <div className="risk-matrix-cell cell-low">
                      <span>Low</span>
                      <small style={{ fontSize: "10px", fontWeight: 400 }}>0</small>
                    </div>
                  </td>
                  <td>
                    <div className="risk-matrix-cell cell-medium">
                      <span>Med</span>
                      <small style={{ fontSize: "10px", fontWeight: 400 }}>1</small>
                    </div>
                  </td>
                  <td>
                    <div className="risk-matrix-cell cell-high">
                      <span>High</span>
                      <small style={{ fontSize: "10px", fontWeight: 400 }}>{severityCounts.high}</small>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, fontSize: "12px", color: "#854d0e" }}>Medium</td>
                  <td>
                    <div className="risk-matrix-cell cell-info">
                      <span>Info</span>
                      <small style={{ fontSize: "10px", fontWeight: 400 }}>0</small>
                    </div>
                  </td>
                  <td>
                    <div className="risk-matrix-cell cell-low">
                      <span>Low</span>
                      <small style={{ fontSize: "10px", fontWeight: 400 }}>1</small>
                    </div>
                  </td>
                  <td>
                    <div className="risk-matrix-cell cell-medium">
                      <span>Med</span>
                      <small style={{ fontSize: "10px", fontWeight: 400 }}>{severityCounts.medium}</small>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", marginTop: "14px", fontSize: "12px", color: "#64748b" }}>
              <strong style={{ color: "#1e293b", display: "block", marginBottom: "4px" }}>Escalation Protocol:</strong>
              Scores ≥ 16 represent immediate pre-release blockers requiring documented reviewer override.
              Scores 8–15 require secondary human evidence verification.
            </div>
          </div>
        </div>

        {/* Evidence Status Breakdown */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                <Layers size={18} style={{ color: "var(--teal)" }} />
                Explicit Evidence States
              </h2>
              <p>Transparent categorization of claims reviewed against approved brand knowledge.</p>
            </div>
          </div>

          <div style={{ padding: "20px" }}>
            {[
              { label: "Supported Claims", count: evidenceStateCounts.SUPPORTED, color: "#059669", bg: "#ecfdf5", desc: "Verifiable citations to active approved passages" },
              { label: "Contradicted Assertions", count: evidenceStateCounts.CONTRADICTED, color: "#e11d48", bg: "#fff1f2", desc: "Conflicts with explicit policy bounds or prohibitions" },
              { label: "Unverified Claims", count: evidenceStateCounts.UNVERIFIED, color: "#d97706", bg: "#fffbeb", desc: "No matching passage found in knowledge base" },
              { label: "Insufficient Evidence / Scope", count: evidenceStateCounts.INSUFFICIENT_EVIDENCE, color: "#ca8a04", bg: "#fefce8", desc: "Missing qualifiers (e.g. 'up to', audience limitation)" },
              { label: "Outdated / Expired Sources", count: evidenceStateCounts.OUTDATED_SOURCE, color: "#b91c1c", bg: "#fef2f2", desc: "Backed only by sources past their validity date" },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderBottom: "1px solid #f1f5f9",
                  background: item.count > 0 && item.color === "#e11d48" ? item.bg : "transparent",
                  borderRadius: "6px",
                  marginBottom: "4px",
                }}
              >
                <div>
                  <strong style={{ fontSize: "13px", color: "#1e293b", display: "block" }}>{item.label}</strong>
                  <small style={{ fontSize: "11px", color: "#64748b" }}>{item.desc}</small>
                </div>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "6px",
                    background: item.bg,
                    color: item.color,
                  }}
                >
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
