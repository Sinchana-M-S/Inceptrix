import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatusBar } from "@/components/dashboard/StatusBar";
import { RegulationIntakePanel } from "@/components/dashboard/RegulationIntakePanel";
import { PolicyComparisonView } from "@/components/dashboard/PolicyComparisonView";
import { GapDetectionCard } from "@/components/dashboard/GapDetectionCard";
import { RecommendationPanel } from "@/components/dashboard/RecommendationPanel";
import { AuditSection } from "@/components/dashboard/AuditSection";
import { PropagationStatus } from "@/components/dashboard/PropagationStatus";

const Index = () => {
  const [activeSection, setActiveSection] = useState("intake");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 overflow-auto custom-scrollbar">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Compliance Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor regulatory changes, identify gaps, and manage policy
              updates
            </p>
          </div>

          {/* Status Overview */}
          <StatusBar selectedDocId={selectedDocId} />

          {/* Main Grid Layout */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Primary Content */}
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
              />
              <RecommendationPanel docId={selectedDocId} />
            </div>

            {/* Right Column - Secondary Content */}
            <div className="col-span-5 space-y-6">
              <GapDetectionCard docId={selectedDocId} />
              <PropagationStatus />
              <AuditSection docId={selectedDocId} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
