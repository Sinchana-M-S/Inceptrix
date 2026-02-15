import {
  Lightbulb,
  Check,
  Send,
  Eye,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  getPatches,
  transformPatchToRecommendation,
  reviewPatch,
  applyPatch,
  type Recommendation,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface RecommendationPanelProps {
  docId: string | null;
}

const impactConfig = {
  critical: {
    bg: "bg-risk-high-muted",
    text: "text-risk-high",
    label: "Critical",
  },
  high: { bg: "bg-warning-muted", text: "text-warning", label: "High" },
  medium: { bg: "bg-primary/20", text: "text-primary", label: "Medium" },
};

export function RecommendationPanel({ docId }: RecommendationPanelProps) {
  const { toast } = useToast();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const { data: patches, refetch } = useQuery({
    queryKey: ["patches", docId],
    queryFn: () =>
      docId ? getPatches(docId, "proposed") : Promise.resolve([]),
    enabled: !!docId,
  });

  const recommendations: Recommendation[] = (patches || []).map(
    transformPatchToRecommendation
  );

  const handleApprove = async (rec: Recommendation) => {
    if (!rec.patch_id) return;
    setProcessingIds((prev) => new Set(prev).add(rec.id));

    try {
      await reviewPatch(
        rec.patch_id,
        "accept",
        "user",
        "Approved via dashboard"
      );
      await applyPatch(rec.patch_id, "user", false);
      toast({
        title: "Recommendation applied",
        description: `Policy update for ${rec.title} has been applied`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Failed to apply",
        description:
          error instanceof Error
            ? error.message
            : "Failed to apply recommendation",
        variant: "destructive",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(rec.id);
        return next;
      });
    }
  };

  const handleReview = async (rec: Recommendation) => {
    if (!rec.patch_id) return;
    setProcessingIds((prev) => new Set(prev).add(rec.id));

    try {
      await reviewPatch(
        rec.patch_id,
        "request_changes",
        "user",
        "Sent for legal review"
      );
      toast({
        title: "Sent for review",
        description: `Recommendation sent to legal team`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Failed to send",
        description:
          error instanceof Error ? error.message : "Failed to send for review",
        variant: "destructive",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(rec.id);
        return next;
      });
    }
  };

  if (!docId) {
    return (
      <div
        className="glass-card p-6 animate-fade-in"
        style={{ animationDelay: "300ms" }}
      >
        <div className="text-center py-8 text-muted-foreground">
          Select a regulation to view recommendations
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-card p-6 animate-fade-in"
      style={{ animationDelay: "300ms" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center glow-primary">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              AI Recommendations
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            </h2>
            <p className="text-sm text-muted-foreground">
              System-generated policy update suggestions
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No recommendations available. Analyze a regulation document to
          generate recommendations.
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec, index) => {
            const config = impactConfig[rec.impact];
            const isProcessing = processingIds.has(rec.id);

            return (
              <div
                key={rec.id}
                className="p-5 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/30 transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          config.bg,
                          config.text
                        )}
                      >
                        {config.label} Priority
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {rec.confidence}% confidence
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {rec.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {rec.description}
                    </p>
                  </div>
                </div>

                {/* Changes Required */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Required Changes
                  </p>
                  <div className="space-y-1.5">
                    {rec.changes.map((change, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="w-3 h-3 text-primary mt-1 flex-shrink-0" />
                        <span className="text-foreground">{change}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Affected Flows */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Affected Systems
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rec.affectedFlows.map((flow) => (
                      <span
                        key={flow}
                        className="px-2 py-1 rounded-md text-xs bg-muted/50 text-muted-foreground border border-border/50"
                      >
                        {flow}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-border/30">
                  <Button
                    variant="approve"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApprove(rec)}
                    disabled={isProcessing}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve & Apply
                  </Button>
                  <Button
                    variant="review"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReview(rec)}
                    disabled={isProcessing}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send for Legal Review
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View Impact
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
