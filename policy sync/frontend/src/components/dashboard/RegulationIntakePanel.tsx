import {
  FileText,
  Calendar,
  Globe,
  AlertCircle,
  Clock,
  ExternalLink,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  getClauses,
  transformClauseToRegulation,
  type Regulation,
} from "@/lib/api";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ingestRegulation } from "@/lib/api";

interface RegulationIntakePanelProps {
  onSelectDoc?: (docId: string) => void;
}

export function RegulationIntakePanel({
  onSelectDoc,
}: RegulationIntakePanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocIds, setUploadingDocIds] = useState<Set<string>>(
    new Set()
  );

  // For now, we'll track ingested documents in localStorage
  // In production, this would come from a backend endpoint listing all docs
  const [ingestedDocs, setIngestedDocs] = useState<string[]>(() => {
    const stored = localStorage.getItem("ingested_docs");
    return stored ? JSON.parse(stored) : [];
  });

  // Fetch clauses for each ingested document
  const clausesQueries = useQuery({
    queryKey: ["regulations", ingestedDocs],
    queryFn: async () => {
      const allRegulations: Regulation[] = [];
      for (const docId of ingestedDocs) {
        try {
          const clauses = await getClauses(docId);
          const regulation = transformClauseToRegulation(
            clauses[0] || {
              clause_id: docId,
              doc_id: docId,
              text: "No clauses extracted yet",
            },
            docId,
            "Recently ingested"
          );
          regulation.doc_id = docId;
          regulation.clauses_count = clauses.length;
          allRegulations.push(regulation);
        } catch (error) {
          console.error(`Failed to fetch clauses for ${docId}:`, error);
        }
      }
      return allRegulations;
    },
    enabled: ingestedDocs.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const regulations = clausesQueries.data || [];

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await ingestRegulation(file);
      const newDocs = [...ingestedDocs, result.doc_id];
      setIngestedDocs(newDocs);
      localStorage.setItem("ingested_docs", JSON.stringify(newDocs));
      toast({
        title: "Regulation ingested",
        description: `Successfully ingested ${result.clauses_extracted} clauses from ${file.name}`,
      });
      clausesQueries.refetch();
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to ingest regulation",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = async (docId: string) => {
    if (uploadingDocIds.has(docId)) return;
    setUploadingDocIds((prev) => new Set(prev).add(docId));

    try {
      const response = await fetch(
        `http://localhost:8000/docs/${docId}/analyze`,
        {
          method: "POST",
        }
      );
      if (!response.ok) throw new Error("Analysis failed");
      const result = await response.json();
      toast({
        title: "Analysis complete",
        description: `Analyzed ${result.clauses_count} clauses`,
      });
      clausesQueries.refetch();
      if (onSelectDoc) onSelectDoc(docId);
    } catch (error) {
      toast({
        title: "Analysis failed",
        description:
          error instanceof Error ? error.message : "Failed to analyze document",
        variant: "destructive",
      });
    } finally {
      setUploadingDocIds((prev) => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  };
  return (
    <div className="glass-card p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Regulation Intake
            </h2>
            <p className="text-sm text-muted-foreground">
              Newly ingested regulatory documents
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Regulation
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLink className="w-4 h-4 mr-2" />
            View All
          </Button>
        </div>
      </div>

      {/* Regulations List */}
      {clausesQueries.isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          Loading regulations...
        </div>
      )}
      {regulations.length === 0 && !clausesQueries.isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          No regulations ingested yet. Upload a regulation document to get
          started.
        </div>
      )}
      <div className="space-y-4">
        {regulations.map((reg, index) => {
          const isAnalyzing = uploadingDocIds.has(reg.doc_id);
          return (
            <div
              key={reg.id}
              className="p-4 rounded-xl bg-secondary/30 border border-border/30 hover:border-primary/30 transition-all duration-300"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Regulation Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground">{reg.title}</h3>
                    {reg.status === "new" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                        New
                      </span>
                    )}
                    {reg.status === "analyzing" && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning-muted text-warning flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-spin" />
                        Analyzing
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {reg.jurisdiction}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Effective: {reg.effectiveDate}
                    </span>
                    <span>Source: {reg.source}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {reg.ingestedAt}
                </span>
              </div>

              {/* Excerpt with Highlighted Phrases */}
              <div className="mb-4 p-3 rounded-lg bg-muted/30 font-mono text-sm text-secondary-foreground leading-relaxed">
                {reg.excerpt
                  .split(
                    /(non-replicable biometric element|strong customer authentication|ICT third-party risk|biometric|authentication|compliance|regulation)/gi
                  )
                  .map((part, i) => {
                    const isHighlight = reg.keyPhrases.some((phrase) =>
                      part.toLowerCase().includes(phrase.toLowerCase())
                    );
                    return isHighlight ? (
                      <span key={i} className="legal-highlight">
                        {part}
                      </span>
                    ) : (
                      <span key={i}>{part}</span>
                    );
                  })}
              </div>

              {/* Key Phrases */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="text-xs text-muted-foreground mr-2">
                  Key phrases:
                </span>
                {reg.keyPhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="px-2 py-1 rounded-md text-xs font-medium bg-highlight-legal-bg text-highlight-legal border border-highlight-legal/20"
                  >
                    {phrase}
                  </span>
                ))}
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAnalyze(reg.doc_id)}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Analyze Document
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert */}
      {regulations.filter((r) => r.status === "new").length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-warning-muted/50 border border-warning/20 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">Action Required</p>
            <p className="text-xs text-muted-foreground">
              {regulations.filter((r) => r.status === "new").length} new
              regulation
              {regulations.filter((r) => r.status === "new").length !== 1
                ? "s"
                : ""}{" "}
              require
              {regulations.filter((r) => r.status === "new").length === 1
                ? "s"
                : ""}{" "}
              policy comparison analysis. Click "Analyze Document" to begin.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
