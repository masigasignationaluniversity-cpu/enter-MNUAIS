import { AlertTriangle, Clock, ShieldAlert, Unlock, Info, CheckCircle2, Bell, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export type BannerType = 'warning' | 'deadline' | 'error' | 'open' | 'info' | 'success' | 'notice';

interface BannerConfig {
  icon: LucideIcon;
  bar: string;         // top accent bar bg + text
  barIcon: string;     // icon color in bar
  card: string;        // card border + bg
  iconBadge: string;   // body icon circle
  bodyText: string;    // body text color
}

const CONFIG: Record<BannerType, BannerConfig> = {
  warning: {
    icon: AlertTriangle,
    bar:      'bg-amber-400',
    barIcon:  'text-amber-900',
    card:     'border-2 border-amber-400 bg-amber-50',
    iconBadge:'bg-amber-100 border-2 border-amber-300 text-amber-700',
    bodyText: 'text-amber-800',
  },
  deadline: {
    icon: Clock,
    bar:      'bg-orange-400',
    barIcon:  'text-orange-900',
    card:     'border-2 border-orange-400 bg-orange-50',
    iconBadge:'bg-orange-100 border-2 border-orange-300 text-orange-700',
    bodyText: 'text-orange-800',
  },
  error: {
    icon: ShieldAlert,
    bar:      'bg-red-500',
    barIcon:  'text-red-50',
    card:     'border-2 border-red-400 bg-red-50',
    iconBadge:'bg-red-100 border-2 border-red-300 text-red-700',
    bodyText: 'text-red-800',
  },
  open: {
    icon: Unlock,
    bar:      'bg-emerald-500',
    barIcon:  'text-emerald-50',
    card:     'border-2 border-emerald-400 bg-emerald-50',
    iconBadge:'bg-emerald-100 border-2 border-emerald-300 text-emerald-700',
    bodyText: 'text-emerald-800',
  },
  info: {
    icon: Info,
    bar:      'bg-sky-500',
    barIcon:  'text-sky-50',
    card:     'border-2 border-sky-400 bg-sky-50',
    iconBadge:'bg-sky-100 border-2 border-sky-300 text-sky-700',
    bodyText: 'text-sky-800',
  },
  success: {
    icon: CheckCircle2,
    bar:      'bg-emerald-500',
    barIcon:  'text-emerald-50',
    card:     'border-2 border-emerald-400 bg-emerald-50',
    iconBadge:'bg-emerald-100 border-2 border-emerald-300 text-emerald-700',
    bodyText: 'text-emerald-800',
  },
  notice: {
    icon: Bell,
    bar:      'bg-slate-500',
    barIcon:  'text-slate-50',
    card:     'border-2 border-slate-400 bg-slate-50',
    iconBadge:'bg-slate-100 border-2 border-slate-300 text-slate-600',
    bodyText: 'text-slate-700',
  },
};

interface StatusBannerProps {
  type: BannerType;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function StatusBanner({ type, title, description, children, className }: StatusBannerProps) {
  const { icon: Icon, bar, barIcon, card, iconBadge, bodyText } = CONFIG[type];
  const hasBody = !!description || !!children;

  return (
    <div className={cn('rounded-xl overflow-hidden', card, className)}>
      {/* Top accent bar */}
      <div className={cn('px-4 py-1.5 flex items-center gap-2', bar)}>
        <Icon size={13} className={barIcon} />
        <span className={cn('text-[11px] font-bold uppercase tracking-wider leading-none', barIcon)}>{title}</span>
      </div>
      {/* Body — only when there's description or children */}
      {hasBody && (
        <div className="px-4 py-3 flex items-start gap-3">
          <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', iconBadge)}>
            <Icon size={15} />
          </div>
          <div className={cn('flex-1 min-w-0 text-sm', bodyText)}>
            {description && <span className="leading-relaxed">{description}</span>}
            {children && <div className={description ? 'mt-1.5' : ''}>{children}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusBanner;
