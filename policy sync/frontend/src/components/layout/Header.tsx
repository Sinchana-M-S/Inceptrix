import { Search, Bell, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="h-16 bg-card/50 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search regulations, policies, or clauses..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-xs text-muted-foreground bg-muted">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-4">
          {/* Sync Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success-muted">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-medium text-success">Systems Synced</span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-risk-high text-[10px] font-bold flex items-center justify-center">
              3
            </span>
          </Button>

          {/* User */}
          <button className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Sarah Chen</p>
              <p className="text-xs text-muted-foreground">Chief Compliance Officer</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
