import { 
  FileText, 
  GitCompare, 
  AlertTriangle, 
  Lightbulb, 
  ClipboardCheck, 
  Activity,
  Shield,
  Settings,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ElementType;
  label: string;
  id: string;
  badge?: number;
  status?: 'active' | 'warning' | 'error';
}

const navItems: NavItem[] = [
  { icon: FileText, label: "Regulation Intake", id: "intake", badge: 3 },
  { icon: GitCompare, label: "Policy Comparison", id: "comparison" },
  { icon: AlertTriangle, label: "Gap Detection", id: "gaps", badge: 2, status: 'warning' },
  { icon: Lightbulb, label: "Recommendations", id: "recommendations" },
  { icon: ClipboardCheck, label: "Audit Trail", id: "audit" },
  { icon: Activity, label: "Propagation Status", id: "propagation", status: 'active' },
];

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground tracking-tight">PolicySync™</h1>
            <p className="text-xs text-muted-foreground">Clause Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-3">
          Compliance Modules
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn(
                "w-4 h-4",
                isActive && "text-primary"
              )} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium",
                  item.status === 'warning' 
                    ? "bg-warning-muted text-warning" 
                    : item.status === 'error'
                    ? "bg-risk-high-muted text-risk-high"
                    : "bg-primary/20 text-primary"
                )}>
                  {item.badge}
                </span>
              )}
              {item.status === 'active' && !item.badge && (
                <span className="w-2 h-2 rounded-full bg-status-active animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-risk-high-muted text-risk-high">5</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
