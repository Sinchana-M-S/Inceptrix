/**
 * Policy Sync Model API Client for ApexBank Employee Dashboard
 * Mirrors the official Policy Sync frontend client but keeps
 * a separate base URL so it can live alongside the main app API.
 */

const MODEL_API_BASE_URL =
  import.meta.env.VITE_MODEL_API_URL || "http://localhost:8000";

export interface Clause {
  clause_id: string;
  doc_id: string;
  jurisdiction?: string;
  authority?: string;
  scope?: string;
  enforcement_risk?: string;
  text: string;
  page?: number;
  paragraph?: number;
  metadata?: Record<string, any>;
}

export interface Regulation {
  id: string;
  title: string;
  source: string;
  jurisdiction: string;
  effectiveDate: string;
  ingestedAt: string;
  status: "new" | "analyzing" | "reviewed";
  keyPhrases: string[];
  excerpt: string;
  doc_id: string;
  clauses_count?: number;
}

export interface PolicyComparison {
  clause_id: string;
  clause_text: string;
  regulation_reference: string;
  current_policy_text?: string;
  proposed_policy_text?: string;
  diff_type?: "ADD" | "MODIFY" | "DEPRECATE" | "UNCHANGED";
  rationale?: string;
  unified_diff?: string;
  span_highlights?: Array<{
    start: number;
    end: number;
    type: "added" | "removed" | "modified";
  }>;
}

export interface Gap {
  id: string;
  title: string;
  regulation: string;
  currentState: string;
  requiredState: string;
  riskLevel: "high" | "medium" | "low";
  affectedSystems: number;
  deadline: string;
  clause_id: string;
  doc_id: string;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: "critical" | "high" | "medium";
  changes: string[];
  affectedFlows: string[];
  confidence: number;
  patch_id?: string;
  clause_id?: string;
  doc_id?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  role: string;
  timestamp: string;
  details: string;
  type:
    | "approval"
    | "review"
    | "update"
    | "comment"
    | "proposal"
    | "accepted"
    | "applied";
  patch_id?: string;
}

export interface SystemUpdate {
  id: string;
  name: string;
  type: "document" | "service" | "database" | "user-facing";
  status: "completed" | "in-progress" | "pending" | "error";
  timestamp?: string;
  progress?: number;
}

// --- Core API functions ---

export async function ingestRegulation(
  file: File,
  docId?: string
): Promise<{ doc_id: string; clauses_extracted: number }> {
  const formData = new FormData();
  formData.append("file", file);
  if (docId) formData.append("doc_id", docId);

  const response = await fetch(`${MODEL_API_BASE_URL}/ingest-regulation`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to ingest regulation: ${response.statusText}`);
  }

  return response.json();
}

export async function ingestPolicy(
  file: File,
  policyId: string = "default"
): Promise<{ policy_id: string; chunks_added: number }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("policy_id", policyId);

  const response = await fetch(`${MODEL_API_BASE_URL}/ingest-policy`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to ingest policy: ${response.statusText}`);
  }

  return response.json();
}

export async function getClauses(docId: string): Promise<Clause[]> {
  const response = await fetch(
    `${MODEL_API_BASE_URL}/docs/${encodeURIComponent(docId)}/clauses`
  );
  if (!response.ok) {
    throw new Error(`Failed to get clauses: ${response.statusText}`);
  }
  const data = await response.json();
  return data.clauses || [];
}

export async function analyzeDocument(docId: string): Promise<{
  doc_id: string;
  clauses_count: number;
  summary: Array<{ clause_id: string; diff_type?: string }>;
}> {
  const response = await fetch(
    `${MODEL_API_BASE_URL}/docs/${encodeURIComponent(docId)}/analyze`,
    {
      method: "POST",
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to analyze document: ${response.statusText}`);
  }
  return response.json();
}

export async function getAuditTrail(docId: string): Promise<AuditEntry[]> {
  const response = await fetch(
    `${MODEL_API_BASE_URL}/audit/${encodeURIComponent(docId)}`
  );
  if (!response.ok) {
    throw new Error(`Failed to get audit trail: ${response.statusText}`);
  }
  const data = await response.json();
  return (data.entries || []).map((entry: any, idx: number) => ({
    id: entry.patch?.patch_id || `audit-${idx}`,
    action:
      entry.type === "proposal"
        ? "Policy Proposal Created"
        : entry.type === "accepted"
        ? "Policy Update Accepted"
        : entry.type === "applied"
        ? "Policy Update Applied"
        : entry.type === "review"
        ? "Review Completed"
        : "Policy Update",
    actor: entry.agent || entry.actor || "System",
    role:
      entry.agent === "regulatory"
        ? "Regulatory Analyst"
        : entry.agent === "policy"
        ? "Policy Engineer"
        : entry.agent === "risk"
        ? "Risk Assessor"
        : entry.agent === "diff"
        ? "Diff Generator"
        : entry.agent === "audit"
        ? "Audit Agent"
        : "Automated System",
    timestamp: entry.timestamp
      ? new Date(entry.timestamp).toLocaleString()
      : new Date().toLocaleString(),
    details:
      entry.patch?.rationale ||
      entry.review_comments ||
      `Clause ${entry.clause_id || "N/A"} processed`,
    type:
      entry.type === "proposal"
        ? "update"
        : entry.type === "accepted"
        ? "approval"
        : entry.type === "review"
        ? "review"
        : "comment",
    patch_id: entry.patch?.patch_id,
  }));
}

export async function getPatches(
  docId: string,
  status?: string
): Promise<any[]> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  params.append("limit", "100");
  params.append("offset", "0");

  const response = await fetch(
    `${MODEL_API_BASE_URL}/audit/${encodeURIComponent(
      docId
    )}/patches?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error(`Failed to get patches: ${response.statusText}`);
  }
  const data = await response.json();
  return data.patches || [];
}

export async function reviewPatch(
  patchId: string,
  reviewAction: "accept" | "reject" | "request_changes",
  reviewerId: string,
  reviewComments?: string,
  humanOverride: boolean = false
): Promise<any> {
  const formData = new FormData();
  formData.append("review_action", reviewAction);
  formData.append("reviewer_id", reviewerId);
  if (reviewComments) formData.append("review_comments", reviewComments);
  formData.append("human_override", String(humanOverride));

  const response = await fetch(
    `${MODEL_API_BASE_URL}/patches/${encodeURIComponent(patchId)}/review`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to review patch: ${response.statusText}`);
  }

  return response.json();
}

export async function applyPatch(
  patchId: string,
  reviewerId: string,
  humanOverride: boolean = false
): Promise<any> {
  const formData = new FormData();
  formData.append("reviewer_id", reviewerId);
  formData.append("human_override", String(humanOverride));

  const response = await fetch(
    `${MODEL_API_BASE_URL}/patches/${encodeURIComponent(patchId)}/apply`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to apply patch: ${response.statusText}`);
  }

  return response.json();
}

export async function simulateDiff(
  docId: string | null,
  clauseId: string | null,
  clauseText: string,
  policyId: string | null,
  policyText: string | null,
  save: boolean = false
): Promise<{
  diff: any;
  unified_diff: string;
  span_highlights: any[];
  saved: boolean;
}> {
  const response = await fetch(`${MODEL_API_BASE_URL}/simulate/diff`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      doc_id: docId,
      clause_id: clauseId,
      clause_text: clauseText,
      policy_id: policyId,
      policy_text: policyText,
      save,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to simulate diff: ${response.statusText}`);
  }

  return response.json();
}

export async function checkModelHealth(): Promise<{ status: string }> {
  const response = await fetch(`${MODEL_API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error("Model backend is not available");
  }
  return response.json();
}

// --- Data transformation helpers ---

export function transformClauseToRegulation(
  clause: Clause,
  docId: string,
  ingestedAt: string
): Regulation {
  const keyPhrases = extractKeyPhrases(clause.text);

  return {
    id: clause.clause_id,
    title: clause.metadata?.title || `Clause ${clause.clause_id}`,
    source: clause.authority || "Unknown Authority",
    jurisdiction: clause.jurisdiction || "Unknown",
    effectiveDate: clause.metadata?.effective_date || "Not specified",
    ingestedAt,
    status: "new",
    keyPhrases,
    excerpt:
      clause.text.substring(0, 200) +
      (clause.text.length > 200 ? "..." : ""),
    doc_id: docId,
  };
}

export function transformPatchToRecommendation(patch: any): Recommendation {
  const remediation = patch.remediation || {};
  const changes = remediation.checklist || [];
  const confidence = Math.round((patch.confidence || 0.5) * 100);

  const riskScore = patch.confidence || 0.5;
  const impact: "critical" | "high" | "medium" =
    riskScore > 0.8 ? "critical" : riskScore > 0.6 ? "high" : "medium";

  return {
    id: patch.patch_id,
    title:
      patch.rationale?.substring(0, 60) ||
      `Policy Update: ${patch.clause_id || "N/A"}`,
    description:
      patch.rationale || "Policy update required to meet regulatory compliance",
    impact,
    changes:
      changes.length > 0 ? changes : [patch.rationale || "Review and update policy"],
    affectedFlows: patch.remediation?.technical?.pseudo
      ? ["Policy Engine", "Compliance System"]
      : ["Policy Document"],
    confidence,
    patch_id: patch.patch_id,
    clause_id: patch.clause_id,
    doc_id: patch.doc_id,
  };
}

function extractKeyPhrases(text: string): string[] {
  const phrases: string[] = [];
  const regulatoryTerms = [
    "authentication",
    "biometric",
    "MFA",
    "TOTP",
    "password",
    "encryption",
    "compliance",
    "regulation",
    "requirement",
    "obligation",
    "deadline",
    "notification",
    "reporting",
    "monitoring",
    "assessment",
    "risk",
  ];

  regulatoryTerms.forEach((term) => {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      phrases.push(term);
    }
  });

  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) {
    phrases.push(...quoted.map((q) => q.replace(/"/g, "")));
  }

  return phrases.slice(0, 5);
}

