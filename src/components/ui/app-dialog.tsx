import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";

export type AppDialogIntent = "default" | "warning" | "danger" | "success" | "info";

const intentConfig: Record<
  AppDialogIntent,
  {
    strip: string;
    iconBg: string;
    iconColor: string;
    Icon: React.ElementType;
    confirmClass: string;
  }
> = {
  default: {
    strip: "bg-[image:var(--gradient-header)]",
    iconBg: "bg-primary/10 border-primary/20",
    iconColor: "text-primary",
    Icon: ShieldAlert,
    confirmClass: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
  warning: {
    strip: "bg-gradient-to-r from-amber-500 to-orange-500",
    iconBg: "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-700/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    Icon: AlertTriangle,
    confirmClass: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  danger: {
    strip: "bg-gradient-to-r from-red-500 to-rose-600",
    iconBg: "bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-700/50",
    iconColor: "text-red-600 dark:text-red-400",
    Icon: XCircle,
    confirmClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
  },
  success: {
    strip: "bg-gradient-to-r from-emerald-500 to-green-600",
    iconBg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-700/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    Icon: CheckCircle2,
    confirmClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  info: {
    strip: "bg-gradient-to-r from-sky-500 to-blue-600",
    iconBg: "bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-700/50",
    iconColor: "text-sky-600 dark:text-sky-400",
    Icon: Info,
    confirmClass: "bg-sky-600 hover:bg-sky-700 text-white",
  },
};

export interface AppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent?: AppDialogIntent;
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  disabled?: boolean;
  /** Hide the footer buttons entirely (use when you have custom children controls) */
  noFooter?: boolean;
  className?: string;
  maxWidth?: string;
}

export function AppDialog({
  open,
  onOpenChange,
  intent = "default",
  icon,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  disabled,
  noFooter,
  className,
  maxWidth = "max-w-md",
}: AppDialogProps) {
  const cfg = intentConfig[intent];
  const DefaultIcon = cfg.Icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0 overflow-hidden gap-0", maxWidth, className)}>
        {/* Colored top strip */}
        <div className={cn("h-1.5 w-full", cfg.strip)} />

        {/* Icon + Title */}
        <div className="flex flex-col items-center text-center px-6 pt-5 pb-2 gap-3">
          <div className={cn("w-14 h-14 rounded-2xl border-2 flex items-center justify-center shadow-sm", cfg.iconBg)}>
            {icon ?? <DefaultIcon size={26} className={cfg.iconColor} />}
          </div>
          <DialogTitle className="text-base font-bold text-foreground leading-snug">
            {title}
          </DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed -mt-1">
              {description}
            </p>
          )}
        </div>

        {/* Body */}
        {children && (
          <div className="px-6 py-2">
            {children}
          </div>
        )}

        {/* Footer */}
        {!noFooter && (onConfirm || cancelLabel) && (
          <div className="flex gap-2.5 px-6 py-4">
            {cancelLabel && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                {cancelLabel}
              </Button>
            )}
            {onConfirm && (
              <Button
                className={cn("flex-1 font-semibold", cfg.confirmClass)}
                disabled={disabled}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
