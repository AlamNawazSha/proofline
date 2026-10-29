"use client";
import React, { useState, useEffect } from "react";
import {
  Network,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookOpen,
  FileText,
  Sliders,
  AlertTriangle,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  X,
  Sparkles,
} from "lucide-react";

interface EvidenceGraphProps {
  api: (path: string, method?: string, data?: any) => Promise<any>;
  onSelectDocument?: (docId: string) => void;
}

export default function EvidenceGraph({ api, onSelectDocument }: EvidenceGraphProps) {
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [zoom, setZoom] = useState(1);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const data = await api("/graph");
      setGraphData(data || { nodes: [], edges: [] });
    } catch {
      // Fallback if network issue
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  const filteredNodes = graphData.nodes.filter((node) => {
    const matchesType = filterType === "all" || node.type === filterType;
    const matchesSearch =
      !searchQuery ||
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (node.fullLabel && node.fullLabel.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "source":
        return <BookOpen size={16} className="text-blue-500" />;
      case "passage":
        return <Layers size={16} className="text-cyan-500" />;
      case "rule":
        return <Sliders size={16} className="text-purple-500" />;
      case "finding":
        return <AlertTriangle size={16} className="text-orange-500" />;
      case "document":
        return <FileText size={16} className="text-emerald-500" />;
      case "receipt":
        return <ShieldCheck size={16} className="text-teal-500" />;
      default:
        return <Network size={16} />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case "source":
        return "#3b82f6";
      case "passage":
        return "#06b6d4";
      case "rule":
        return "#a855f7";
      case "finding":
        return "#f97316";
      case "document":
        return "#10b981";
      case "receipt":
        return "#14b8a6";
      default:
        return "#64748b";
    }
  };

  return (
    <div className="panel" style={{ marginTop: "16px" }}>
      <div className="panel-heading">
        <div>
          <h2>
            <Network size={18} style={{ color: "var(--cyan-600)" }} />
            Interactive Evidence Graph
          </h2>
          <p>
            Persisted traceability mapping connecting Sources → Passages → Policy Rules → Findings → Documents → Cryptographic Release Receipts.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className="btn" onClick={() => loadGraph()} title="Refresh Graph">
            Refresh
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="graph-toolbar">
        {/* Type Filter Chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          {["all", "source", "passage", "rule", "finding", "document", "receipt"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "4px 10px",
                borderRadius: "20px",
                border: "1px solid",
                borderColor: filterType === t ? "#38bdf8" : "#475569",
                background: filterType === t ? "#0369a1" : "rgba(255,255,255,0.05)",
                color: filterType === t ? "#ffffff" : "#cbd5e1",
                textTransform: "capitalize",
                cursor: "pointer",
              }}
            >
              {t === "all" ? "All Elements" : t + "s"}
            </button>
          ))}
        </div>

        {/* Search & Zoom */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "12px",
            }}
          >
            <Search size={14} style={{ color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search graph nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#f8fafc",
                fontSize: "12px",
                width: "160px",
                padding: 0,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "2px", background: "#0f172a", borderRadius: "6px", padding: "2px" }}>
            <button
              className="icon-btn"
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              title="Zoom In"
              style={{ color: "#cbd5e1" }}
            >
              <ZoomIn size={15} />
            </button>
            <button
              className="icon-btn"
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              title="Zoom Out"
              style={{ color: "#cbd5e1" }}
            >
              <ZoomOut size={15} />
            </button>
            <button
              className="icon-btn"
              onClick={() => setZoom(1)}
              title="Reset Zoom"
              style={{ color: "#cbd5e1" }}
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="graph-container">
        <div className="graph-canvas" style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          {loading ? (
            <div style={{ padding: "80px", textAlign: "center", color: "#94a3b8" }}>
              Loading interactive evidence graph...
            </div>
          ) : filteredNodes.length === 0 ? (
            <div style={{ padding: "80px", textAlign: "center", color: "#94a3b8" }}>
              No nodes match the selected filter or search term.
            </div>
          ) : (
            <div className="graph-nodes-grid">
              {filteredNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div
                    key={node.id}
                    className={`graph-node-card ${isSelected ? "selected" : ""}`}
                    data-type={node.type}
                    onClick={() => setSelectedNode(node)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.8px",
                          color: getNodeColor(node.type),
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {getNodeIcon(node.type)}
                        {node.type}
                      </span>
                      <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "monospace" }}>
                        {node.id.length > 14 ? node.id.slice(0, 12) + "…" : node.id}
                      </span>
                    </div>

                    <strong style={{ fontSize: "13px", display: "block", color: "#f8fafc", lineHeight: 1.4 }}>
                      {node.label}
                    </strong>

                    {node.metadata?.trustLevel && (
                      <span
                        style={{
                          fontSize: "10px",
                          display: "inline-block",
                          marginTop: "8px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(255,255,255,0.08)",
                          color: "#38bdf8",
                        }}
                      >
                        {node.metadata.trustLevel}
                      </span>
                    )}

                    {node.metadata?.severity && (
                      <span
                        style={{
                          fontSize: "10px",
                          display: "inline-block",
                          marginTop: "8px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: node.metadata.severity === "high" || node.metadata.severity === "critical" ? "#450a0a" : "#422006",
                          color: node.metadata.severity === "high" || node.metadata.severity === "critical" ? "#fca5a5" : "#fde047",
                        }}
                      >
                        Severity: {node.metadata.severity}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="graph-inspector">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {getNodeIcon(selectedNode.type)}
                <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: getNodeColor(selectedNode.type) }}>
                  {selectedNode.type} Details
                </span>
              </div>
              <button
                className="icon-btn"
                onClick={() => setSelectedNode(null)}
                style={{ color: "#94a3b8" }}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ fontSize: "15px", color: "#f8fafc", marginBottom: "12px" }}>
              {selectedNode.fullLabel || selectedNode.label}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", color: "#cbd5e1" }}>
              <div>
                <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>NODE IDENTIFIER</span>
                <code style={{ background: "#0f172a", color: "#38bdf8" }}>{selectedNode.id}</code>
              </div>

              {selectedNode.metadata?.text && (
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>PASSAGE EXCERPT</span>
                  <div style={{ background: "#0f172a", padding: "8px 10px", borderRadius: "6px", lineHeight: 1.6, marginTop: "4px" }}>
                    “{selectedNode.metadata.text}”
                  </div>
                </div>
              )}

              {selectedNode.metadata?.trustLevel && (
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>TRUST DESIGNATION</span>
                  <span style={{ fontWeight: 600, color: "#38bdf8" }}>{selectedNode.metadata.trustLevel}</span>
                </div>
              )}

              {selectedNode.metadata?.fingerprint && (
                <div>
                  <span style={{ color: "#64748b", display: "block", fontSize: "11px" }}>SHA-256 FINGERPRINT</span>
                  <code style={{ background: "#0f172a", fontSize: "10px", color: "#10b981" }}>{selectedNode.metadata.fingerprint}</code>
                </div>
              )}

              {/* Connected Relationships */}
              <div style={{ marginTop: "12px", borderTop: "1px solid #334155", paddingTop: "12px" }}>
                <span style={{ color: "#64748b", display: "block", fontSize: "11px", marginBottom: "6px" }}>CONNECTED EDGES</span>
                {graphData.edges
                  .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map((e) => (
                    <div
                      key={e.id}
                      style={{
                        fontSize: "11px",
                        padding: "4px 8px",
                        background: "#0f172a",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <ArrowRight size={12} style={{ color: "#38bdf8" }} />
                      <span>{e.label || e.type}</span>
                      <span style={{ color: "#64748b", marginLeft: "auto" }}>
                        {e.source === selectedNode.id ? "→ " + e.target.slice(0, 8) : "← " + e.source.slice(0, 8)}
                      </span>
                    </div>
                  ))}
              </div>

              {selectedNode.type === "document" && onSelectDocument && (
                <button
                  className="btn primary"
                  style={{ marginTop: "16px", width: "100%", justifyContent: "center" }}
                  onClick={() => onSelectDocument(selectedNode.id)}
                >
                  Open in Review Editor
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
