import { AlertTriangle, Clock, ShieldAlert, Unlock, Info, CheckCircle2, Bell, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type BannerType = 'warning' | 'deadline' | 'error' | 'open' | 'info' | 'success' | 'notice';

interface BannerConfig {
  icon: LucideIcon;
  cssType: string;
  iconBg: string;
}

const CONFIG: Record<BannerType, BannerConfig> = {
  warning:  { icon: AlertTriangle, cssType: 'banner-warning',  iconBg: 'bg-amber-100'   },
  deadline: { icon: Clock,         cssType: 'banner-deadline', iconBg: 'bg-orange-100'  },
  error:    { icon: ShieldAlert,   cssType: 'banner-error',    iconBg: 'bg-red-100'     },
  open:     { icon: Unlock,        cssType: 'banner-open',     iconBg: 'bg-green-100'   },
  info:     { icon: Info,          cssType: 'banner-info',     iconBg: 'bg-sky-100'     },
  success:  { icon: CheckCircle2,  cssType: 'banner-success',  iconBg: 'bg-emerald-100' },
  notice:   { icon: Bell,          cssType: 'banner-notice',   iconBg: 'bg-slate-100'   },
};

interface StatusBannerProps {
  type: BannerType;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function StatusBanner({ type, title, description, children, className }: StatusBannerProps) {
  const { icon: Icon, cssType, iconBg } = CONFIG[type];
  return (
    <div className={cn('banner', cssType, className)}>
      <div className={cn('rounded-full p-1.5 flex-shrink-0 mt-0.5', iconBg)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <span className="banner-title">{title}</span>
        {description && <span className="banner-desc">{description}</span>}
        {children && <div className="banner-desc mt-1">{children}</div>}
      </div>
    </div>
  );
}

export default StatusBanner;
