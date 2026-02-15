/**
 * Policy Change – Regulatory Sentinel Integration
 * Embeds the full Regulatory Sentinel dashboard (from final/policy change) as-is.
 * Requires the Regulatory Sentinel Python backend to be running on port 8000.
 */

import React from "react";
import { ArrowLeft, Shield } from "lucide-react";

const POLICY_CHANGE_DASHBOARD_URL =
  import.meta.env.VITE_POLICY_CHANGE_URL || "http://localhost:8000/dashboard";

export interface PolicyChangeViewProps {
  onBackHome?: () => void;
  onBackToDashboard?: () => void;
}

export default function PolicyChangeView({
  onBackHome,
  onBackToDashboard,
}: PolicyChangeViewProps) {
  const [retryKey, setRetryKey] = React.useState(0);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Header bar - matches ApexBank theme */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 shrink-0">
        {(onBackHome || onBackToDashboard) && (
          <button
            type="button"
            onClick={onBackToDashboard || onBackHome}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-[#0a192f] hover:bg-gray-50 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            {onBackToDashboard ? "Back to Employee Dashboard" : "Back to ApexBank"}
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#c5a059]/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-[#c5a059]" />
          </div>
          <span className="font-semibold text-[#0a192f]">
            Policy Change – Regulatory Sentinel
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="text-sm text-[#64748b] hover:text-[#c5a059]"
          >
            Reload
          </button>
          <a
            href={POLICY_CHANGE_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#64748b] hover:text-[#c5a059]"
          >
            Open in new tab
          </a>
        </div>
      </header>

      {/* Full-height iframe container */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <iframe
          key={retryKey}
          src={POLICY_CHANGE_DASHBOARD_URL}
          title="Regulatory Sentinel – Policy Change Dashboard"
          className="w-full flex-1 border-0 min-h-[600px]"
        />
      </div>
    </div>
  );
}
