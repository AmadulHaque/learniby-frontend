import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "default" | "card";
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "card",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        variant === "card" &&
          "rounded-2xl border-2 border-dashed border-border bg-card",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-8 w-8 text-primary" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-base font-extrabold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
