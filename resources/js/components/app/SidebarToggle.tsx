import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarToggleProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

/** The burger button in the top bar that shrinks the side menu to icons and brings it back (desktop only). */
export function SidebarToggle({ collapsed, onToggle, className }: SidebarToggleProps) {
  const label = collapsed ? "Expand menu" : "Collapse menu";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={collapsed}
      title={label}
      className={cn("-ml-2 text-slate-600 hover:text-slate-900", className)}
    >
      <Menu className="h-6 w-6" />
    </Button>
  );
}
