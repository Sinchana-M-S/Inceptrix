import {
  ClipboardCheck,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getAuditTrail, type AuditEntry } from "@/lib/api";

interface AuditSectionProps {
  docId: string | null;
}

const typeConfig = {
  approval: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success-muted",
  },
  review: { icon: FileText, color: "text-primary", bg: "bg-primary/20" },
  update: { icon: Clock, color: "text-warning", bg: "bg-warning-muted" },
  comment: {
    icon: MessageSquare,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  proposal: { icon: Clock, color: "text-warning", bg: "bg-warning-muted" },
  accepted: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success-muted",
  },
  applied: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success-muted",
  },
};

export function AuditSection({ docId }: AuditSectionProps) {
  const { data: auditTrail = [], isLoading } = useQuery({
    queryKey: ["audit", docId],
    queryFn: () => (docId ? getAuditTrail(docId) : Promise.resolve([])),
    enabled: !!docId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  if (!docId) {
    return (
      <div
        className="glass-card p-6 animate-fade-in"
        style={{ animationDelay: "400ms" }}
      >
        <div className="text-center py-8 text-muted-foreground">
          Select a regulation to view audit trail
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card p-6 animate-fade-in"
      style={{ animationDelay: "400ms" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-muted flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-success" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Audit Trail & Explainability
            </h2>
            <p className="text-sm text-muted-foreground">
              Complete compliance decision history
            </p>
          </div>
        </div>
      </div>

      {/* Explainability Box */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Why is the current policy non-compliant?
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Regulatory requirements are analyzed against current internal
          policies. When gaps are identified, the system generates
          recommendations with traceability to source clauses, rationale, and
          confidence scores. All changes are tracked in this audit trail for
          compliance and explainability.
        </p>
      </div>

      {/* Audit Timeline */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading audit trail...
        </div>
      ) : auditTrail.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No audit entries yet. Actions will appear here as you analyze and
          process regulations.
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {auditTrail.map((entry, index) => {
              const config = typeConfig[entry.type] || typeConfig.comment;
              const Icon = config.icon;

              return (
                <div
                  key={entry.id}
                  className="relative flex gap-4 pl-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Timeline Node */}
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center z-10",
                      config.bg
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-foreground">
                        {entry.action}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {entry.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm text-foreground">
                        {entry.actor}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {entry.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.details}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
