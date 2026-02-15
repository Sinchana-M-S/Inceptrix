import { ArrowLeftRight, Scale, ChevronDown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getClauses, simulateDiff, type PolicyComparison } from "@/lib/api";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PolicyComparisonViewProps {
  docId: string | null;
  clauseId: string | null;
  onSelectClause?: (clauseId: string | null) => void;
}

export function PolicyComparisonView({
  docId,
  clauseId,
  onSelectClause,
}: PolicyComparisonViewProps) {
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(
    clauseId
  );

  const { data: clauses } = useQuery({
    queryKey: ["clauses", docId],
    queryFn: () => (docId ? getClauses(docId) : Promise.resolve([])),
    enabled: !!docId,
  });

  const selectedClause = clauses?.find((c) => c.clause_id === selectedClauseId);

  const { data: diffData } = useQuery({
    queryKey: ["diff", docId, selectedClauseId],
    queryFn: async () => {
      if (!selectedClause) return null;
      return simulateDiff(
        docId || null,
        selectedClauseId || null,
        selectedClause.text,
        null,
        null,
        false
      );
    },
    enabled: !!selectedClause && !!selectedClauseId,
  });

  if (!docId) {
    return (
      <div
        className="glass-card p-6 animate-fade-in"
        style={{ animationDelay: "100ms" }}
      >
        <div className="text-center py-8 text-muted-foreground">
          Select a regulation document to view policy comparisons
        </div>
      </div>
    );
  }

  if (!clauses || clauses.length === 0) {
    return (
      <div
        className="glass-card p-6 animate-fade-in"
        style={{ animationDelay: "100ms" }}
      >
        <div className="text-center py-8 text-muted-foreground">
          No clauses found. Please analyze the document first.
        </div>
      </div>
    );
  }

  const currentPolicyText = diffData?.diff?.proposed_policy_text || "";
  const regulatoryText = selectedClause?.text || "";
  const diffType = diffData?.diff?.type || "UNCHANGED";
  const rationale = diffData?.diff?.rationale || "";

  return (
    <div
      className="glass-card p-6 animate-fade-in"
      style={{ animationDelay: "100ms" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Scale className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Policy Comparison
            </h2>
            <p className="text-sm text-muted-foreground">
              Regulatory clause vs. internal policy analysis
            </p>
          </div>
        </div>
        <Select
          value={selectedClauseId || ""}
          onValueChange={(value) => {
            setSelectedClauseId(value);
            if (onSelectClause) onSelectClause(value);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Clause" />
          </SelectTrigger>
          <SelectContent>
            {clauses.map((clause) => (
              <SelectItem key={clause.clause_id} value={clause.clause_id}>
                {clause.clause_id} - {clause.text.substring(0, 50)}...
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedClause ? (
        <div className="text-center py-8 text-muted-foreground">
          Select a clause to view comparison
        </div>
      ) : (
        <>
          {/* Comparison Split View */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left: Regulatory Clause */}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="px-4 py-3 bg-primary/5 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Regulatory Requirement
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    {selectedClause.jurisdiction || "N/A"} -{" "}
                    {selectedClause.clause_id}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-muted/20">
                <p className="font-mono text-sm text-secondary-foreground leading-relaxed">
                  {regulatoryText}
                </p>
                {selectedClause.metadata?.deadlines &&
                  selectedClause.metadata.deadlines.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <p className="text-xs text-muted-foreground mb-2">
                        Deadlines:
                      </p>
                      {selectedClause.metadata.deadlines.map(
                        (deadline: any, idx: number) => (
                          <p key={idx} className="text-sm text-foreground">
                            {deadline.text}{" "}
                            {deadline.date ? `(${deadline.date})` : ""}
                          </p>
                        )
                      )}
                    </div>
                  )}
              </div>
            </div>

            {/* Right: Current Policy */}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div
                className={`px-4 py-3 border-b border-border/30 ${
                  diffType === "UNCHANGED"
                    ? "bg-success-muted/30"
                    : "bg-risk-high-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Current Internal Policy
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      diffType === "UNCHANGED"
                        ? "bg-success-muted text-success"
                        : "bg-risk-high-muted text-risk-high"
                    }`}
                  >
                    {diffType === "UNCHANGED" ? "Compliant" : "Non-Compliant"}
                  </span>
                </div>
              </div>
              <div className="p-4 bg-muted/20">
                <p className="font-mono text-sm text-secondary-foreground leading-relaxed">
                  {currentPolicyText || "No matching policy found"}
                </p>
                {rationale && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-2">
                      Analysis:
                    </p>
                    <p className="text-sm text-foreground">{rationale}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Gap Summary */}
          {diffType !== "UNCHANGED" && (
            <div className="mt-4 p-4 rounded-xl bg-risk-high-muted/30 border border-risk-high/20">
              <div className="flex items-center gap-3 mb-3">
                <X className="w-5 h-5 text-risk-high" />
                <span className="font-medium text-foreground">
                  Compliance Gap Identified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-risk-high-muted flex items-center justify-center mt-0.5">
                    <X className="w-3 h-3 text-risk-high" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Gap Type</p>
                    <p className="text-muted-foreground">{diffType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-success-muted flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Action Required
                    </p>
                    <p className="text-muted-foreground">
                      Policy update needed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
