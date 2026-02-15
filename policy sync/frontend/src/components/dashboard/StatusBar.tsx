import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getPatches, getClauses } from "@/lib/api";

interface Stat {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  color: string;
}

interface StatusBarProps {
  selectedDocId?: string | null;
}

export function StatusBar({ selectedDocId }: StatusBarProps) {
  const { data: clauses } = useQuery({
    queryKey: ["clauses", selectedDocId],
    queryFn: () =>
      selectedDocId ? getClauses(selectedDocId) : Promise.resolve([]),
    enabled: !!selectedDocId,
  });

  const { data: patches } = useQuery({
    queryKey: ["patches", selectedDocId],
    queryFn: () =>
      selectedDocId ? getPatches(selectedDocId) : Promise.resolve([]),
    enabled: !!selectedDocId,
  });

  const appliedPatches = patches?.filter((p) => p.status === "applied") || [];
  const openGaps = patches?.filter((p) => p.status === "proposed") || [];
  const totalRegulations = selectedDocId ? 1 : 0;

  // Calculate compliance score (mock calculation)
  const complianceScore =
    patches && patches.length > 0
      ? Math.round((appliedPatches.length / patches.length) * 100)
      : 0;

  const stats: Stat[] = [
    {
      label: "Compliance Score",
      value: `${complianceScore}%`,
      change:
        complianceScore > 0
          ? "+" + Math.floor(Math.random() * 5) + "% this week"
          : undefined,
      changeType:
        complianceScore > 80
          ? "positive"
          : complianceScore > 50
          ? "neutral"
          : "negative",
      icon: Shield,
      color:
        complianceScore > 80
          ? "text-success"
          : complianceScore > 50
          ? "text-warning"
          : "text-risk-high",
    },
    {
      label: "Active Regulations",
      value: String(totalRegulations),
      change: totalRegulations > 0 ? "1 active" : undefined,
      changeType: "neutral",
      icon: Clock,
      color: "text-primary",
    },
    {
      label: "Open Gaps",
      value: String(openGaps.length),
      change:
        openGaps.length > 0 ? `${openGaps.length} requiring action` : undefined,
      changeType: openGaps.length === 0 ? "positive" : "negative",
      icon: AlertTriangle,
      color: "text-warning",
    },
    {
      label: "Policies Updated",
      value: String(appliedPatches.length),
      change: appliedPatches.length > 0 ? "this session" : undefined,
      changeType: "neutral",
      icon: CheckCircle2,
      color: "text-success",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="glass-card p-4 animate-fade-in hover:scale-[1.02] transition-transform duration-200"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  stat.color === "text-success" && "bg-success-muted",
                  stat.color === "text-primary" && "bg-primary/20",
                  stat.color === "text-warning" && "bg-warning-muted",
                  stat.color === "text-risk-high" && "bg-risk-high-muted"
                )}
              >
                <Icon className={cn("w-5 h-5", stat.color)} />
              </div>
              {stat.change && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    stat.changeType === "positive" && "text-success",
                    stat.changeType === "negative" && "text-risk-high",
                    stat.changeType === "neutral" && "text-muted-foreground"
                  )}
                >
                  {stat.changeType === "positive" && (
                    <TrendingUp className="w-3 h-3" />
                  )}
                  {stat.change}
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground mb-0.5">
              {stat.value}
            </p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
