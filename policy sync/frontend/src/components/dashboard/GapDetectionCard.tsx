import { AlertTriangle, Shield, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  getClauses,
  analyzeDocument,
  transformAnalysisToGap,
  type Gap,
} from "@/lib/api";

interface GapDetectionCardProps {
  docId: string | null;
}

const riskConfig = {
  high: {
    bg: "bg-risk-high-muted",
    text: "text-risk-high",
    border: "border-risk-high/30",
    label: "High Risk",
  },
  medium: {
    bg: "bg-risk-medium-muted",
    text: "text-risk-medium",
    border: "border-risk-medium/30",
    label: "Medium Risk",
  },
  low: {
    bg: "bg-risk-low-muted",
    text: "text-risk-low",
    border: "border-risk-low/30",
    label: "Low Risk",
  },
};

export function GapDetectionCard({ docId }: GapDetectionCardProps) {
  const { data: clauses } = useQuery({
    queryKey: ["clauses", docId],
    queryFn: () => (docId ? getClauses(docId) : Promise.resolve([])),
    enabled: !!docId,
  });

  const { data: analysisData } = useQuery({
    queryKey: ["analysis", docId],
    queryFn: async () => {
      if (!docId) return null;
      try {
        const response = await fetch(
          `http://localhost:8000/docs/${docId}/analyze`,
          {
            method: "POST",
          }
        );
        if (!response.ok) throw new Error("Analysis failed");
        return response.json();
      } catch (error) {
        console.error("Analysis error:", error);
        return null;
      }
    },
    enabled: !!docId && !!clauses && clauses.length > 0,
  });

  // Transform analysis data to gaps
  const gaps: Gap[] = [];
  if (analysisData && clauses) {
    // For each clause, check if there's a gap
    // In a real implementation, we'd fetch the full analysis for each clause
    clauses.forEach((clause) => {
      // Mock gap transformation - in production, this would come from the analysis endpoint
      if (
        clause.enforcement_risk === "High" ||
        clause.enforcement_risk === "Medium"
      ) {
        gaps.push({
          id: `gap-${clause.clause_id}`,
          title: `Compliance Gap: ${clause.clause_id}`,
          regulation: `${clause.jurisdiction || "N/A"} - ${clause.clause_id}`,
          currentState: "Policy review required",
          requiredState: clause.text.substring(0, 100),
          riskLevel: clause.enforcement_risk === "High" ? "high" : "medium",
          affectedSystems: 1,
          deadline: clause.metadata?.deadlines?.[0]?.date || "Not specified",
          clause_id: clause.clause_id,
          doc_id: clause.doc_id,
        });
      }
    });
  }

  if (!docId) {
    return (
      <div
        className="glass-card p-6 animate-fade-in"
        style={{ animationDelay: "200ms" }}
      >
        <div className="text-center py-8 text-muted-foreground">
          Select a regulation to view compliance gaps
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card p-6 animate-fade-in"
      style={{ animationDelay: "200ms" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning-muted flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Compliance Gap Detection
            </h2>
            <p className="text-sm text-muted-foreground">
              Identified policy mismatches requiring action
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Total gaps:</span>
          <span className="font-semibold text-warning">{gaps.length}</span>
        </div>
      </div>

      {/* Risk Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {Object.entries(riskConfig).map(([level, config]) => {
          const count = gaps.filter((g) => g.riskLevel === level).length;
          return (
            <div
              key={level}
              className={cn("p-3 rounded-lg border", config.bg, config.border)}
            >
              <p className={cn("text-2xl font-bold", config.text)}>{count}</p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          );
        })}
      </div>

      {/* Gap List */}
      {gaps.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No compliance gaps detected. Run analysis to identify gaps.
        </div>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap) => {
            const config = riskConfig[gap.riskLevel];
            return (
              <div
                key={gap.id}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.01]",
                  config.border,
                  "bg-secondary/20 hover:bg-secondary/40"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground">
                        {gap.title}
                      </h3>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          config.bg,
                          config.text
                        )}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {gap.regulation}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>

                {/* Gap Details */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="p-2 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">
                      Current State
                    </p>
                    <p className="text-sm text-foreground">
                      {gap.currentState}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">
                      Required State
                    </p>
                    <p className="text-sm text-foreground">
                      {gap.requiredState}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Shield className="w-3 h-3" />
                      {gap.affectedSystems} systems affected
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      Deadline: {gap.deadline}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
