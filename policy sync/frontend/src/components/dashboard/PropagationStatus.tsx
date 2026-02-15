import { Activity, CheckCircle2, Clock, AlertCircle, Server, FileText, Users, Database, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemUpdate {
  id: string;
  name: string;
  type: 'document' | 'service' | 'database' | 'user-facing';
  status: 'completed' | 'in-progress' | 'pending' | 'error';
  timestamp?: string;
  progress?: number;
}

const systems: SystemUpdate[] = [
  { id: "sys-1", name: "Policy Document Repository", type: "document", status: "completed", timestamp: "Completed 2:35 PM" },
  { id: "sys-2", name: "Authentication Service", type: "service", status: "in-progress", progress: 67 },
  { id: "sys-3", name: "Mobile Banking App", type: "user-facing", status: "in-progress", progress: 45 },
  { id: "sys-4", name: "Web Banking Portal", type: "user-facing", status: "pending" },
  { id: "sys-5", name: "API Gateway", type: "service", status: "pending" },
  { id: "sys-6", name: "Compliance Database", type: "database", status: "completed", timestamp: "Completed 2:30 PM" },
  { id: "sys-7", name: "Internal Admin Portal", type: "user-facing", status: "pending" },
  { id: "sys-8", name: "Audit Logging Service", type: "service", status: "completed", timestamp: "Completed 2:32 PM" }
];

const statusConfig = {
  completed: { icon: CheckCircle2, color: "text-success", bg: "bg-success-muted", label: "Completed" },
  "in-progress": { icon: RefreshCw, color: "text-primary", bg: "bg-primary/20", label: "Syncing" },
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", label: "Pending" },
  error: { icon: AlertCircle, color: "text-risk-high", bg: "bg-risk-high-muted", label: "Error" }
};

const typeConfig = {
  document: { icon: FileText, label: "Document" },
  service: { icon: Server, label: "Service" },
  database: { icon: Database, label: "Database" },
  "user-facing": { icon: Users, label: "User-Facing" }
};

export function PropagationStatus() {
  const completedCount = systems.filter(s => s.status === 'completed').length;
  const totalCount = systems.length;
  const overallProgress = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "500ms" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center relative">
            <Activity className="w-5 h-5 text-primary" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-status-syncing animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Propagation Status</h2>
            <p className="text-sm text-muted-foreground">Real-time policy update deployment</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{overallProgress}%</p>
          <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} systems</p>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="progress-bar">
          <div 
            className="progress-bar-fill animate-progress-pulse" 
            style={{ width: `${overallProgress}%` }} 
          />
        </div>
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-2 gap-3">
        {systems.map((system) => {
          const status = statusConfig[system.status];
          const type = typeConfig[system.type];
          const StatusIcon = status.icon;
          const TypeIcon = type.icon;

          return (
            <div 
              key={system.id}
              className={cn(
                "p-4 rounded-xl border transition-all duration-200",
                "bg-secondary/20 border-border/30",
                system.status === 'in-progress' && "border-primary/30"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", status.bg)}>
                    <TypeIcon className={cn("w-4 h-4", status.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{system.name}</p>
                    <p className="text-xs text-muted-foreground">{type.label}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <StatusIcon className={cn(
                    "w-3.5 h-3.5",
                    status.color,
                    system.status === 'in-progress' && "animate-spin"
                  )} />
                  <span className={cn("text-xs font-medium", status.color)}>
                    {status.label}
                  </span>
                </div>
                {system.timestamp && (
                  <span className="text-xs text-muted-foreground">{system.timestamp}</span>
                )}
                {system.progress !== undefined && (
                  <span className="text-xs text-primary font-medium">{system.progress}%</span>
                )}
              </div>

              {system.progress !== undefined && (
                <div className="mt-2 progress-bar">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${system.progress}%` }} 
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-center gap-6">
        {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <Icon className={cn("w-3 h-3", config.color)} />
              <span className="text-xs text-muted-foreground">{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
