/**
 * PolicyGuardian Suite – Compliance Dashboard
 * Styled to match ApexBank theme: #0a192f (navy), #c5a059 (gold), #f8fafc (bg), #64748b (muted)
 * Shown only when user is logged in as employee.
 */

import React, { useEffect, useState } from "react";
import {
  Shield,
  FileText,
  GitCompare,
  AlertTriangle,
  Lightbulb,
  ClipboardCheck,
  Activity,
  Settings,
  Bell,
  Search,
  User,
  ChevronDown,
  Clock,
  CheckCircle2,
  TrendingUp,
  Globe,
  Calendar,
  ExternalLink,
  AlertCircle,
  Scale,
  ChevronRight,
  X,
  Check,
  Send,
  Eye,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  RefreshCw,
  Server,
  Database,
  Users,
  LogOut,
  Upload,
  LayoutDashboard,
} from "lucide-react";
import { getAuthToken, getUserName, logout as apiLogout } from "../utils/api";
import {
  type Regulation,
  type Gap,
  type Recommendation,
  type AuditEntry,
  type Clause,
  ingestRegulation,
  getClauses,
  analyzeDocument,
  simulateDiff,
  getPatches,
  reviewPatch,
  applyPatch,
  getAuditTrail,
  transformPatchToRecommendation,
} from "../modelApi";

function Sidebar({
  activeSection,
  onSectionChange,
  onOpenPolicyChange,
}: {
  activeSection: string;
  onSectionChange: (s: string) => void;
  onOpenPolicyChange?: () => void;
}) {
  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
    { icon: FileText, label: "Regulation Intake", id: "intake", badge: 3 },
    { icon: GitCompare, label: "Policy Comparison", id: "comparison" },
    { icon: AlertTriangle, label: "Gap Detection", id: "gaps", badge: 2 },
    { icon: Lightbulb, label: "Recommendations", id: "recommendations" },
    { icon: ClipboardCheck, label: "Audit Trail", id: "audit" },
    { icon: Activity, label: "Propagation Status", id: "propagation" },
  ];

  return (
    <aside className="w-72 bg-[#0a192f] border-r border-white/10 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c5a059]/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#c5a059]" />
          </div>
          <div>
            <h1 className="font-semibold text-white tracking-tight">
              PolicyGuardian
            </h1>
            <p className="text-xs text-gray-400">ApexBank Compliance</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-3">
          Compliance Modules
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#c5a059]" : ""}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge != null && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5">
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
            5
          </span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/5">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
        {onOpenPolicyChange && (
          <button
            type="button"
            onClick={onOpenPolicyChange}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059]/30"
          >
            <Scale className="w-4 h-4" />
            <span>Policy Change</span>
            <ExternalLink className="w-4 h-4 ml-auto" />
          </button>
        )}
      </div>
    </aside>
  );
}

function Header({
  onLogout,
  onBackHome,
}: {
  onLogout: () => void;
  onBackHome?: () => void;
}) {
  const userName = getUserName();

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          {onBackHome && (
            <button
              type="button"
              onClick={onBackHome}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-[#0a192f] hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to ApexBank</span>
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search regulations, policies, or clauses..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-[#0a192f] placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-[#c5a059]/30 focus:border-[#c5a059]"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs text-[#64748b] bg-gray-100">
              ⌘K
            </kbd>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-600">
              Systems Synced
            </span>
          </div>
          <button
            type="button"
            className="relative p-2 rounded-lg hover:bg-gray-100 text-[#64748b]"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              3
            </span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#c5a059]/20 flex items-center justify-center">
              <User className="w-4 h-4 text-[#c5a059]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#0a192f]">
                {userName || "Employee"}
              </p>
              <p className="text-xs text-[#64748b]">ApexBank Staff</p>
            </div>
            <ChevronDown className="w-4 h-4 text-[#64748b]" />
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-[#64748b] hover:bg-gray-50 hover:text-[#0a192f] text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function GuidedOverview() {
  return (
    <div className="mb-6 rounded-2xl border border-dashed border-[#c5a059]/40 bg-[#fffaf0] px-4 py-3 text-sm text-[#654321] flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-[#c5a059]" />
        <p className="font-semibold text-[#0a192f]">
          How this AI compliance flow works (for judges)
        </p>
      </div>
      <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
        <li>
          <span className="font-semibold">Upload regulation (left, Regulation Intake):</span>{" "}
          PDF is sent to the AI service on port 8000, which extracts clauses and stores them in its
          own SQLite DB (`reggenai.db`).
        </li>
        <li>
          <span className="font-semibold">Analyze document:</span>{" "}
          multi‑agent pipeline maps each clause to internal policy and generates structured diffs
          and proposed patches.
        </li>
        <li>
          <span className="font-semibold">Compare policy (Policy Comparison):</span>{" "}
          left shows the raw regulatory clause, right shows AI‑reconstructed internal policy text
          plus rationale and gap classification.
        </li>
        <li>
          <span className="font-semibold">See gaps (Gap Detection):</span>{" "}
          high/medium‑risk clauses become gap cards with required vs current state and deadlines.
        </li>
        <li>
          <span className="font-semibold">Act on AI recommendations:</span>{" "}
          approving a recommendation calls the model’s patch endpoints and records changes
          back into SQLite and the audit log.
        </li>
        <li>
          <span className="font-semibold">Audit everything (Audit Trail):</span>{" "}
          every proposal, review, and applied patch is logged with timestamp and actor for
          governance and explainability.
        </li>
      </ol>
    </div>
  );
}

function StatusBar({ selectedDocId }: { selectedDocId: string | null }) {
  const [clausesCount, setClausesCount] = useState(0);
  const [patchesCount, setPatchesCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedDocId) {
        setClausesCount(0);
        setPatchesCount(0);
        setAppliedCount(0);
        return;
      }
      setLoading(true);
      try {
        const [clauses, patches] = await Promise.all([
          getClauses(selectedDocId),
          getPatches(selectedDocId),
        ]);
        if (cancelled) return;
        setClausesCount(clauses.length);
        setPatchesCount(patches.length);
        setAppliedCount(
          patches.filter((p: any) => p.status === "applied").length,
        );
      } catch {
        if (!cancelled) {
          setClausesCount(0);
          setPatchesCount(0);
          setAppliedCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedDocId]);

  const complianceScore =
    patchesCount > 0 ? Math.round((appliedCount / patchesCount) * 100) : 0;

  const stats = [
    {
      label: "Compliance Score",
      value: loading ? "…" : `${complianceScore}%`,
      change: complianceScore > 0 ? "+ up from last review" : undefined,
      icon: Shield,
      color:
        complianceScore > 80
          ? "text-green-600"
          : complianceScore > 50
            ? "text-amber-600"
            : "text-red-600",
      bg:
        complianceScore > 80
          ? "bg-green-50"
          : complianceScore > 50
            ? "bg-amber-50"
            : "bg-red-50",
    },
    {
      label: "Active Regulations",
      value: selectedDocId ? "1" : "0",
      change: selectedDocId ? "Current document" : undefined,
      icon: Clock,
      color: "text-[#c5a059]",
      bg: "bg-[#c5a059]/10",
    },
    {
      label: "Open Gaps",
      value: loading
        ? "…"
        : String(
            patchesCount - appliedCount < 0 ? 0 : patchesCount - appliedCount,
          ),
      change:
        patchesCount - appliedCount > 0
          ? "Requires remediation"
          : patchesCount > 0
            ? "All applied"
            : undefined,
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Policies Updated",
      value: loading ? "…" : String(appliedCount),
      change: appliedCount > 0 ? "This session" : undefined,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              {stat.change && (
                <div className="text-xs font-medium text-[#64748b]">
                  {stat.change}
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-[#0a192f] mb-0.5">
              {stat.value}
            </p>
            <p className="text-sm text-[#64748b]">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function RegulationIntakePanel({
  onSelectDoc,
}: {
  onSelectDoc?: (docId: string) => void;
}) {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("pg_ingested_docs");
    if (!stored) return;
    const ids: string[] = JSON.parse(stored);
    if (ids.length === 0) return;

    const load = async () => {
      setLoading(true);
      try {
        const all: Regulation[] = [];
        for (const docId of ids) {
          try {
            const clauses = await getClauses(docId);
            const baseClause: Clause =
              clauses[0] ||
              ({
                clause_id: docId,
                doc_id: docId,
                text: "No clauses extracted yet",
              } as Clause);
            const reg: Regulation = {
              id: baseClause.clause_id,
              title:
                baseClause.metadata?.title ||
                `Regulation ${baseClause.clause_id}`,
              source: baseClause.authority || "Unknown Authority",
              jurisdiction: baseClause.jurisdiction || "Unknown",
              effectiveDate:
                baseClause.metadata?.effective_date || "Not specified",
              ingestedAt: "Recently ingested",
              status: "new",
              keyPhrases: [],
              excerpt:
                baseClause.text.substring(0, 200) +
                (baseClause.text.length > 200 ? "..." : ""),
              doc_id: docId,
              clauses_count: clauses.length,
            };
            all.push(reg);
          } catch {
            // ignore individual doc failures
          }
        }
        setRegulations(all);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await ingestRegulation(file);
      const existing: string[] = JSON.parse(
        window.localStorage.getItem("pg_ingested_docs") || "[]",
      );
      const nextIds = Array.from(new Set([...existing, result.doc_id]));
      window.localStorage.setItem("pg_ingested_docs", JSON.stringify(nextIds));

      const clauses = await getClauses(result.doc_id);
      const baseClause: Clause =
        clauses[0] ||
        ({
          clause_id: result.doc_id,
          doc_id: result.doc_id,
          text: "No clauses extracted yet",
        } as Clause);
      const reg: Regulation = {
        id: baseClause.clause_id,
        title:
          baseClause.metadata?.title || `Regulation ${baseClause.clause_id}`,
        source: baseClause.authority || "Unknown Authority",
        jurisdiction: baseClause.jurisdiction || "Unknown",
        effectiveDate: baseClause.metadata?.effective_date || "Not specified",
        ingestedAt: "Just now",
        status: "new",
        keyPhrases: [],
        excerpt:
          baseClause.text.substring(0, 200) +
          (baseClause.text.length > 200 ? "..." : ""),
        doc_id: result.doc_id,
        clauses_count: clauses.length,
      };
      setRegulations((prev) => [reg, ...prev]);
      onSelectDoc?.(result.doc_id);
    } catch (err) {
      console.error("Failed to ingest regulation", err);
      alert(
        "Failed to ingest regulation. Make sure the AI policy-sync backend is running on port 8000.",
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c5a059]/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#c5a059]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#0a192f]">
              Regulation Intake
            </h2>
            <p className="text-sm text-[#64748b]">
              Newly ingested regulatory documents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-[#0a192f] hover:bg-gray-50 cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading…" : "Upload Regulation"}
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-[#0a192f] hover:bg-gray-50"
          >
            <ExternalLink className="w-4 h-4" />
            View All
          </button>
        </div>
      </div>
      {loading && (
        <div className="text-center py-8 text-[#64748b] text-sm">
          Loading ingested regulations…
        </div>
      )}
      {!loading && regulations.length === 0 && (
        <div className="text-center py-8 text-[#64748b] text-sm">
          No regulations ingested yet. Upload a regulation document to get
          started.
        </div>
      )}
      <div className="space-y-4">
        {regulations.map((reg) => (
          <div
            key={reg.id}
            className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#c5a059]/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-[#0a192f]">{reg.title}</h3>
                  {reg.status === "new" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#c5a059]/20 text-[#c5a059]">
                      New
                    </span>
                  )}
                  {reg.status === "analyzing" && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" />
                      Analyzing
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#64748b]">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {reg.jurisdiction}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Effective: {reg.effectiveDate}
                  </span>
                </div>
              </div>
              <span className="text-xs text-[#64748b]">{reg.ingestedAt}</span>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-white border border-gray-100 font-mono text-sm text-[#64748b] leading-relaxed">
              {reg.excerpt}
            </div>
            <div className="flex flex-wrap gap-2">
              {reg.keyPhrases.map((phrase) => (
                <span
                  key={phrase}
                  className="px-2 py-1 rounded-md text-xs font-medium bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/20"
                >
                  {phrase}
                </span>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  setAnalyzingDocId(reg.doc_id);
                  try {
                    await analyzeDocument(reg.doc_id);
                    alert(
                      `Analysis complete! Check Policy Comparison, Gap Detection, and Recommendations panels.`,
                    );
                    onSelectDoc?.(reg.doc_id);
                  } catch (err) {
                    console.error("Failed to analyze", err);
                    alert("Failed to analyze document. Please try again.");
                  } finally {
                    setAnalyzingDocId(null);
                  }
                }}
                disabled={analyzingDocId === reg.doc_id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#c5a059] text-white text-sm font-medium hover:bg-[#b38e4a] disabled:opacity-60"
              >
                {analyzingDocId === reg.doc_id ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analyze Document
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
      {regulations.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Action Required
            </p>
            <p className="text-xs text-[#64748b]">
              Analyze ingested regulations to generate AI-powered policy
              comparisons and recommendations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface PolicyComparisonViewProps {
  docId: string | null;
  clauseId: string | null;
  onSelectClause?: (clauseId: string | null) => void;
}

function PolicyComparisonView({
  docId,
  clauseId,
  onSelectClause,
  onPatchCreated,
}: PolicyComparisonViewProps & {
  onPatchCreated?: () => void;
}) {
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(
    clauseId,
  );
  const [regulatoryText, setRegulatoryText] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [diffType, setDiffType] = useState<string | undefined>(undefined);
  const [rationale, setRationale] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingPatch, setSavingPatch] = useState(false);

  useEffect(() => {
    if (!docId) {
      setClauses([]);
      setSelectedClauseId(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getClauses(docId);
        if (cancelled) return;
        setClauses(result);
        if (!selectedClauseId && result.length > 0) {
          const firstId = result[0].clause_id;
          setSelectedClauseId(firstId);
          onSelectClause?.(firstId);
        }
      } catch (err) {
        console.error("Failed to load clauses", err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  useEffect(() => {
    const clause = clauses.find((c) => c.clause_id === selectedClauseId);
    if (!docId || !clause) {
      setRegulatoryText("");
      setPolicyText("");
      setDiffType(undefined);
      setRationale("");
      return;
    }
    let cancelled = false;
    const runDiff = async () => {
      setLoading(true);
      try {
        const diff = await simulateDiff(
          docId,
          clause.clause_id,
          clause.text,
          null,
          null,
          false,
        );
        if (cancelled) return;
        setRegulatoryText(clause.text);
        setPolicyText(diff.diff?.proposed_policy_text || "");
        setDiffType(diff.diff?.type);
        setRationale(diff.diff?.rationale || "");
      } catch (err) {
        console.error("Failed to simulate diff", err);
        if (!cancelled) {
          setRegulatoryText(clause.text);
          setPolicyText("");
          setDiffType(undefined);
          setRationale("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    runDiff();
    return () => {
      cancelled = true;
    };
  }, [docId, selectedClauseId, clauses]);

  if (!docId) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="text-center py-8 text-[#64748b] text-sm">
          Select or upload a regulation to start policy comparison.
        </div>
      </div>
    );
  }

  if (clauses.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="text-center py-8 text-[#64748b] text-sm">
          No clauses extracted yet for this regulation. Run analysis from the
          intake panel.
        </div>
      </div>
    );
  }

  const effectiveDiffType = diffType || "UNCHANGED";

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c5a059]/10 flex items-center justify-center">
            <Scale className="w-5 h-5 text-[#c5a059]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#0a192f]">
              Policy Comparison
            </h2>
            <p className="text-sm text-[#64748b]">
              Regulatory clause vs. internal policy analysis
            </p>
          </div>
        </div>
        <div className="relative">
          <select
            className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 text-sm text-[#0a192f] bg-white focus:outline-none focus:ring-2 focus:ring-[#c5a059]/30 focus:border-[#c5a059] min-w-[220px]"
            value={selectedClauseId || ""}
            onChange={(e) => {
              const value = e.target.value || null;
              setSelectedClauseId(value);
              onSelectClause?.(value);
            }}
          >
            {clauses.map((clause) => (
              <option key={clause.clause_id} value={clause.clause_id}>
                {clause.clause_id} - {clause.text.substring(0, 60)}...
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-[#64748b] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-[#c5a059]/5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#0a192f]">
                Regulatory Requirement
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#c5a059]/20 text-[#c5a059]">
                DORA Art. 9(4)
              </span>
            </div>
          </div>
          <div className="p-4 bg-gray-50">
            <p className="font-mono text-sm text-[#64748b] leading-relaxed whitespace-pre-wrap">
              {regulatoryText}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-red-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#0a192f]">
                Current Internal Policy
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                {effectiveDiffType === "UNCHANGED"
                  ? "Compliant"
                  : "Non-Compliant"}
              </span>
            </div>
          </div>
          <div className="p-4 bg-gray-50">
            <p className="font-mono text-sm text-[#64748b] leading-relaxed whitespace-pre-wrap">
              {loading
                ? "Analyzing clause against existing policies…"
                : policyText || "No matching policy text generated yet."}
            </p>
            {rationale && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-[#0a192f] mb-1">
                  AI Analysis
                </p>
                <p className="text-xs text-[#64748b] whitespace-pre-wrap">
                  {rationale}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      {effectiveDiffType !== "UNCHANGED" && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-center gap-3 mb-3">
            <X className="w-5 h-5 text-red-600" />
            <span className="font-medium text-[#0a192f]">
              Compliance Gap Identified ({effectiveDiffType})
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center mt-0.5 shrink-0">
                <X className="w-3 h-3 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-[#0a192f]">Gap Detected</p>
                <p className="text-[#64748b]">
                  AI has detected that internal policy text does not fully match
                  the regulatory clause.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5 shrink-0">
                <Check className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-[#0a192f]">
                  Suggested Alignment
                </p>
                <p className="text-[#64748b]">
                  Create a recommendation to review and approve this policy update.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={async () => {
                const clause = clauses.find((c) => c.clause_id === selectedClauseId);
                if (!docId || !clause) return;
                setSavingPatch(true);
                try {
                  const result = await simulateDiff(
                    docId,
                    clause.clause_id,
                    clause.text,
                    null,
                    null,
                    true, // save=true creates the patch
                  );
                  if (result.saved) {
                    alert(
                      `Recommendation created! Check the "AI Recommendations" panel below to approve it.`,
                    );
                    onPatchCreated?.();
                  } else {
                    alert("Failed to create recommendation. Please try again.");
                  }
                } catch (err) {
                  console.error("Failed to save patch", err);
                  alert("Failed to create recommendation. Please try again.");
                } finally {
                  setSavingPatch(false);
                }
              }}
              disabled={savingPatch || !selectedClauseId}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c5a059] text-white text-sm font-medium hover:bg-[#b38e4a] disabled:opacity-60"
            >
              {savingPatch ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  Create Recommendation
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GapDetectionCard({ docId }: { docId: string | null }) {
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [loading, setLoading] = useState(false);
  const riskStyles = {
    high: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    medium: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-200",
    },
    low: {
      bg: "bg-green-50",
      text: "text-green-600",
      border: "border-green-200",
    },
  };

  useEffect(() => {
    if (!docId) {
      setGaps([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        await analyzeDocument(docId);
        const clauses = await getClauses(docId);
        if (cancelled) return;
        const next: Gap[] = [];
        clauses.forEach((clause) => {
          if (
            clause.enforcement_risk === "High" ||
            clause.enforcement_risk === "Medium"
          ) {
            next.push({
              id: `gap-${clause.clause_id}`,
              title: `Compliance Gap: ${clause.clause_id}`,
              regulation: `${clause.jurisdiction || "N/A"} - ${
                clause.clause_id
              }`,
              currentState: "Policy review required",
              requiredState: clause.text.substring(0, 120),
              riskLevel: clause.enforcement_risk === "High" ? "high" : "medium",
              affectedSystems: 1,
              deadline:
                clause.metadata?.deadlines?.[0]?.date || "Not specified",
              clause_id: clause.clause_id,
              doc_id: clause.doc_id,
            });
          }
        });
        setGaps(next);
      } catch (err) {
        console.error("Failed to analyze gaps", err);
        if (!cancelled) setGaps([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [docId]);

  if (!docId) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="text-center py-8 text-[#64748b] text-sm">
          Select a regulation to view compliance gaps.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#0a192f]">
              Compliance Gap Detection
            </h2>
            <p className="text-sm text-[#64748b]">
              Identified policy mismatches requiring action
            </p>
          </div>
        </div>
        <span className="text-sm font-semibold text-amber-600">
          {loading ? "Calculating…" : `${gaps.length} gaps`}
        </span>
      </div>
      {gaps.length === 0 && !loading && (
        <div className="text-center py-6 text-[#64748b] text-sm">
          No high- or medium-risk gaps detected yet.
        </div>
      )}
      <div className="space-y-3">
        {gaps.map((gap) => {
          const style = riskStyles[gap.riskLevel];
          return (
            <div
              key={gap.id}
              className={`p-4 rounded-xl border ${style.border} ${style.bg} cursor-pointer hover:opacity-90 transition-opacity`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-[#0a192f]">{gap.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                    >
                      {gap.riskLevel === "high"
                        ? "High Risk"
                        : gap.riskLevel === "medium"
                          ? "Medium"
                          : "Low"}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748b]">{gap.regulation}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#64748b]" />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                <div className="p-2 rounded-lg bg-white/50">
                  <p className="text-xs text-[#64748b] mb-1">Current</p>
                  <p className="text-[#0a192f]">{gap.currentState}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/50">
                  <p className="text-xs text-[#64748b] mb-1">Required</p>
                  <p className="text-[#0a192f]">{gap.requiredState}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#64748b]">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {gap.affectedSystems} systems
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Deadline: {gap.deadline}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecommendationPanel({
  docId,
  refreshTrigger,
  onActionComplete,
}: {
  docId: string | null;
  refreshTrigger?: number;
  onActionComplete?: () => void;
}) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const impactStyles = {
    critical: "bg-red-50 text-red-600",
    high: "bg-amber-50 text-amber-600",
    medium: "bg-[#c5a059]/10 text-[#c5a059]",
  };

  useEffect(() => {
    if (!docId) {
      setRecommendations([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const patches = await getPatches(docId, "proposed");
        if (cancelled) return;
        const recs = (patches || []).map((p: any) =>
          transformPatchToRecommendation(p),
        );
        setRecommendations(recs);
      } catch (err) {
        console.error("Failed to load recommendations", err);
        if (!cancelled) setRecommendations([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [docId, refreshTrigger]);

  const refreshRecs = async () => {
    if (!docId) return;
    try {
      const patches = await getPatches(docId, "proposed");
      const recs = (patches || []).map((p: any) =>
        transformPatchToRecommendation(p),
      );
      setRecommendations(recs);
    } catch (err) {
      console.error("Failed to refresh recommendations", err);
    }
  };

  const handleApprove = async (rec: Recommendation) => {
    if (!rec.patch_id) return;
    setProcessingId(rec.id);
    try {
      await reviewPatch(rec.patch_id, "accept", "employee", "Approved");
      await applyPatch(rec.patch_id, "employee", false);
      alert(
        `Recommendation applied. Policy update for "${rec.title}" has been marked as applied.`,
      );
      await refreshRecs();
      onActionComplete?.(); // Refresh audit trail
    } catch (err) {
      console.error("Failed to apply recommendation", err);
      alert("Failed to apply recommendation. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendForReview = async (rec: Recommendation) => {
    if (!rec.patch_id) return;
    setProcessingId(rec.id);
    try {
      await reviewPatch(
        rec.patch_id,
        "request_changes",
        "employee",
        "Sent for legal review",
      );
      alert("Recommendation sent to legal review queue.");
      onActionComplete?.(); // Refresh audit trail
      await refreshRecs();
      onActionComplete?.(); // Refresh audit trail
    } catch (err) {
      console.error("Failed to send recommendation for review", err);
      alert("Failed to send for review. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!docId) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="text-center py-8 text-[#64748b] text-sm">
          Select a regulation to view AI recommendations.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#c5a059]/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-[#c5a059]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#0a192f] flex items-center gap-2">
            AI Recommendations
            <Sparkles className="w-4 h-4 text-[#c5a059] animate-pulse" />
          </h2>
          <p className="text-sm text-[#64748b]">
            System-generated policy update suggestions
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {recommendations.length === 0 && (
          <div className="text-center py-6 text-[#64748b] text-sm">
            No open AI recommendations yet. Once analysis proposes changes,
            they’ll appear here for approval.
          </div>
        )}
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="p-5 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#c5a059]/30 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  impactStyles[rec.impact]
                }`}
              >
                {rec.impact === "critical"
                  ? "Critical"
                  : rec.impact === "high"
                    ? "High"
                    : "Medium"}{" "}
                Priority
              </span>
              <span className="text-xs text-[#64748b]">
                {rec.confidence}% confidence
              </span>
            </div>
            <h3 className="font-semibold text-[#0a192f] mb-1">{rec.title}</h3>
            <p className="text-sm text-[#64748b] mb-4">{rec.description}</p>
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => handleApprove(rec)}
                disabled={processingId === rec.id}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {processingId === rec.id ? "Applying…" : "Approve & Apply"}
              </button>
              <button
                type="button"
                onClick={() => handleSendForReview(rec)}
                disabled={processingId === rec.id}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#c5a059] text-[#c5a059] text-sm font-medium hover:bg-[#c5a059]/10 disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                {processingId === rec.id ? "Sending…" : "Send for Legal Review"}
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#64748b] hover:bg-gray-100"
              >
                <Eye className="w-4 h-4" />
                View Impact
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditSection({
  docId,
  refreshTrigger,
}: {
  docId: string | null;
  refreshTrigger?: number;
}) {
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const typeConfig = {
    approval: {
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    review: { icon: FileText, color: "text-[#c5a059]", bg: "bg-[#c5a059]/10" },
    update: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    comment: {
      icon: MessageSquare,
      color: "text-[#64748b]",
      bg: "bg-gray-100",
    },
  };

  useEffect(() => {
    if (!docId) {
      setAuditTrail([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const entries = await getAuditTrail(docId);
        if (!cancelled) setAuditTrail(entries);
      } catch (err) {
        console.error("Failed to load audit trail", err);
        if (!cancelled) setAuditTrail([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [docId, refreshTrigger]);

  if (!docId) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="text-center py-8 text-[#64748b] text-sm">
          Select a regulation to view its AI decision history.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#0a192f]">
            Audit Trail & Explainability
          </h2>
          <p className="text-sm text-[#64748b]">
            Complete compliance decision history
          </p>
        </div>
      </div>
      {loading && (
        <div className="mb-4 text-sm text-[#64748b]">
          Loading latest AI audit entries…
        </div>
      )}
      {!loading && auditTrail.length === 0 && (
        <div className="mb-4 text-sm text-[#64748b]">
          No audit entries yet for this regulation. Once AI agents propose or
          apply changes, they will appear here.
        </div>
      )}
      <div className="relative pl-6 border-l-2 border-gray-200">
        {auditTrail.map((entry) => {
          const config = typeConfig[entry.type];
          const Icon = config.icon;
          return (
            <div key={entry.id} className="relative flex gap-4 pb-4">
              <div
                className={`absolute -left-6 w-7 h-7 rounded-full flex items-center justify-center ${config.bg}`}
              >
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-[#0a192f]">{entry.action}</p>
                  <span className="text-xs text-[#64748b]">
                    {entry.timestamp}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-3 h-3 text-[#64748b]" />
                  <span className="text-sm text-[#0a192f]">{entry.actor}</span>
                  <span className="text-xs text-[#64748b]">• {entry.role}</span>
                </div>
                <p className="text-sm text-[#64748b]">{entry.details}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PropagationStatus() {
  const systems = [
    {
      id: "1",
      name: "Policy Document Repository",
      type: "Document",
      status: "completed",
      progress: 100,
    },
    {
      id: "2",
      name: "Authentication Service",
      type: "Service",
      status: "in-progress",
      progress: 67,
    },
    {
      id: "3",
      name: "Mobile Banking App",
      type: "User-Facing",
      status: "in-progress",
      progress: 45,
    },
    {
      id: "4",
      name: "Web Banking Portal",
      type: "User-Facing",
      status: "pending",
      progress: 0,
    },
    {
      id: "5",
      name: "Compliance Database",
      type: "Database",
      status: "completed",
      progress: 100,
    },
  ];
  const completed = systems.filter((s) => s.status === "completed").length;
  const total = systems.length;
  const overallProgress = Math.round((completed / total) * 100);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#c5a059]/10 flex items-center justify-center relative">
            <Activity className="w-5 h-5 text-[#c5a059]" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#c5a059] animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#0a192f]">
              Propagation Status
            </h2>
            <p className="text-sm text-[#64748b]">
              Real-time policy update deployment
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#0a192f]">
            {overallProgress}%
          </p>
          <p className="text-xs text-[#64748b]">
            {completed}/{total} systems
          </p>
        </div>
      </div>
      <div className="mb-6 h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#c5a059] transition-all"
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {systems.map((sys) => (
          <div
            key={sys.id}
            className="p-4 rounded-xl bg-gray-50 border border-gray-200"
          >
            <p className="text-sm font-medium text-[#0a192f]">{sys.name}</p>
            <p className="text-xs text-[#64748b] mb-2">{sys.type}</p>
            <div className="flex items-center gap-2">
              {sys.status === "completed" && (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              )}
              {sys.status === "in-progress" && (
                <RefreshCw className="w-3.5 h-3.5 text-[#c5a059] animate-spin" />
              )}
              {sys.status === "pending" && (
                <Clock className="w-3.5 h-3.5 text-[#64748b]" />
              )}
              <span className="text-xs font-medium text-[#64748b]">
                {sys.status === "completed"
                  ? "Completed"
                  : sys.status === "in-progress"
                    ? `Syncing ${sys.progress}%`
                    : "Pending"}
              </span>
            </div>
            {sys.progress > 0 && sys.progress < 100 && (
              <div className="mt-2 h-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#c5a059]"
                  style={{ width: `${sys.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface PolicyGuardianDashboardProps {
  onLogout: () => void;
  onBackHome?: () => void;
  onOpenPolicyChange?: () => void;
}

export default function PolicyGuardianDashboard({
  onLogout,
  onBackHome,
  onOpenPolicyChange,
}: PolicyGuardianDashboardProps) {
  const [activeSection, setActiveSection] = useState("dashboard");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [recommendationRefreshTrigger, setRecommendationRefreshTrigger] =
    useState(0);
  const [auditRefreshTrigger, setAuditRefreshTrigger] = useState(0);

  const handleLogout = () => {
    apiLogout();
    onLogout();
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case "dashboard": return "Compliance Dashboard";
      case "intake": return "Regulation Intake";
      case "comparison": return "Policy Comparison";
      case "gaps": return "Gap Detection";
      case "recommendations": return "Recommendations";
      case "audit": return "Audit Trail";
      case "propagation": return "Propagation Status";
      default: return "Compliance Dashboard";
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onOpenPolicyChange={onOpenPolicyChange}
      />
      <div className="flex-1 flex flex-col">
        <Header onLogout={handleLogout} onBackHome={onBackHome} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-[#0a192f] mb-1">
              {getSectionTitle()}
            </h1>
            <p className="text-[#64748b]">
              {activeSection === "dashboard"
                ? "Monitor regulatory changes, identify gaps, and manage policy updates"
                : "Manage specific compliance module"}
            </p>
          </div>

          {activeSection === "dashboard" && (
            <>
              <GuidedOverview />
              <StatusBar selectedDocId={selectedDocId} />
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-7 space-y-6">
                  <RegulationIntakePanel
                    onSelectDoc={(docId) => {
                      setSelectedDocId(docId);
                      setActiveSection("comparison");
                    }}
                  />
                  <PolicyComparisonView
                    docId={selectedDocId}
                    clauseId={selectedClauseId}
                    onSelectClause={setSelectedClauseId}
                    onPatchCreated={() => {
                      setRecommendationRefreshTrigger((prev) => prev + 1);
                    }}
                  />
                  <RecommendationPanel
                    docId={selectedDocId}
                    refreshTrigger={recommendationRefreshTrigger}
                    onActionComplete={() => {
                      setAuditRefreshTrigger((prev) => prev + 1);
                    }}
                  />
                </div>
                <div className="col-span-5 space-y-6">
                  <GapDetectionCard docId={selectedDocId} />
                  <PropagationStatus />
                  <AuditSection
                    docId={selectedDocId}
                    refreshTrigger={auditRefreshTrigger}
                  />
                </div>
              </div>
            </>
          )}

          {activeSection === "intake" && (
            <div className="max-w-4xl">
              <RegulationIntakePanel
                onSelectDoc={(docId) => {
                  setSelectedDocId(docId);
                  setActiveSection("comparison");
                }}
              />
            </div>
          )}

          {activeSection === "comparison" && (
            <div className="space-y-6 max-w-5xl">
              <StatusBar selectedDocId={selectedDocId} />
              <PolicyComparisonView
                docId={selectedDocId}
                clauseId={selectedClauseId}
                onSelectClause={setSelectedClauseId}
                onPatchCreated={() => {
                  setRecommendationRefreshTrigger((prev) => prev + 1);
                }}
              />
            </div>
          )}

          {activeSection === "gaps" && (
            <div className="space-y-6 max-w-4xl">
              <StatusBar selectedDocId={selectedDocId} />
              <GapDetectionCard docId={selectedDocId} />
            </div>
          )}

          {activeSection === "recommendations" && (
            <div className="space-y-6 max-w-4xl">
              <StatusBar selectedDocId={selectedDocId} />
              <RecommendationPanel
                docId={selectedDocId}
                refreshTrigger={recommendationRefreshTrigger}
                onActionComplete={() => {
                  setAuditRefreshTrigger((prev) => prev + 1);
                }}
              />
            </div>
          )}

          {activeSection === "audit" && (
            <div className="space-y-6 max-w-4xl">
              <StatusBar selectedDocId={selectedDocId} />
              <AuditSection
                docId={selectedDocId}
                refreshTrigger={auditRefreshTrigger}
              />
            </div>
          )}

          {activeSection === "propagation" && (
            <div className="max-w-3xl">
              <PropagationStatus />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
