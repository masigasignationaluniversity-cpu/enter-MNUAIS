import { AlertTriangle, Clock, ShieldAlert, Unlock, Info, CheckCircle2, Bell, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type BannerType = 'warning' | 'deadline' | 'error' | 'open' | 'info' | 'success' | 'notice';

interface BannerConfig {
  icon: LucideIcon;
  cssType: string;
  iconCls: string;
}

const CONFIG: Record<BannerType, BannerConfig> = {
  warning:  { icon: AlertTriangle, cssType: 'banner-warning',  iconCls: 'bg-amber-100 text-amber-600 shadow-amber-100'    },
  deadline: { icon: Clock,         cssType: 'banner-deadline', iconCls: 'bg-orange-100 text-orange-600 shadow-orange-100' },
  error:    { icon: ShieldAlert,   cssType: 'banner-error',    iconCls: 'bg-red-100 text-red-600 shadow-red-100'         },
  open:     { icon: Unlock,        cssType: 'banner-open',     iconCls: 'bg-emerald-100 text-emerald-600 shadow-emerald-100' },
  info:     { icon: Info,          cssType: 'banner-info',     iconCls: 'bg-sky-100 text-sky-600 shadow-sky-100'         },
  success:  { icon: CheckCircle2,  cssType: 'banner-success',  iconCls: 'bg-emerald-100 text-emerald-600 shadow-emerald-100' },
  notice:   { icon: Bell,          cssType: 'banner-notice',   iconCls: 'bg-slate-100 text-slate-500 shadow-slate-100'   },
};

interface StatusBannerProps {
  type: BannerType;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function StatusBanner({ type, title, description, children, className }: StatusBannerProps) {
  const { icon: Icon, cssType, iconCls } = CONFIG[type];
  return (
    <div className={cn('banner', cssType, className)}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm', iconCls)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="banner-title">{title}</span>
        {description && <span className="banner-desc">{description}</span>}
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}

export default StatusBanner;
