import { Bell, User } from 'lucide-react';
import type { PortalSettings, User as UserType } from '../../lib/types';

interface DashboardAnnouncementsProps {
  portalSettings: PortalSettings;
  user?: UserType | null;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getUserSubline(user: UserType): string {
  if (user.role === 'student') {
    const parts: string[] = [];
    if (user.studentNumber) parts.push(user.studentNumber);
    if (user.program) parts.push(user.program);
    if (user.yearLevel) parts.push(`Year ${user.yearLevel}`);
    return parts.join(' · ');
  }
  if (user.role === 'faculty') return user.department ?? 'Faculty';
  if (user.role === 'ocs') return user.department ? `OCS — ${user.department}` : 'Office of the College Secretary';
  return '';
}

export default function DashboardAnnouncements({ portalSettings, user }: DashboardAnnouncementsProps) {
  const { welcomeTitle, welcomeMessage, announcements } = portalSettings;
  const hasWelcomeContent = welcomeTitle || welcomeMessage;
  const hasAnnouncements = announcements && announcements.trim().length > 0;

  if (!hasWelcomeContent && !hasAnnouncements) return null;

  const initials = user
    ? user.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
    : '?';
  const subline = user ? getUserSubline(user) : '';

  return (
    <div className="space-y-4">
      {/* ── Welcome Hero ── */}
      {hasWelcomeContent && (
        <div
          className="relative overflow-hidden rounded-2xl shadow-sm"
          style={{ background: 'var(--gradient-hero)' }}
        >
          {/* Decorative orbs */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute bottom-0 right-20 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-1/2 -left-6 w-24 h-24 rounded-full bg-white/4 pointer-events-none" />

          <div className="relative z-10 flex items-start gap-4 px-6 py-5">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-white/15 border-2 border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              {user
                ? <span className="text-white font-extrabold text-lg leading-none select-none">{initials}</span>
                : <User size={24} className="text-white/80" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">{getGreeting()}</p>
              {user ? (
                <>
                  <h2 className="text-white font-extrabold text-xl sm:text-2xl leading-tight mt-0.5 truncate">
                    {user.name}
                  </h2>
                  {subline && (
                    <p className="text-white/55 text-xs sm:text-sm mt-1 leading-snug truncate">{subline}</p>
                  )}
                </>
              ) : (
                <h2 className="text-white font-extrabold text-xl mt-0.5">{welcomeTitle}</h2>
              )}

              {/* Welcome message */}
              {(welcomeMessage || (user && welcomeTitle)) && (
                <div className="mt-3 pt-3 border-t border-white/15">
                  {user && welcomeTitle && (
                    <p className="text-white font-semibold text-sm">{welcomeTitle}</p>
                  )}
                  {welcomeMessage && (
                    <p className="text-white/60 text-sm mt-0.5 leading-relaxed">{welcomeMessage}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Announcements ── */}
      {hasAnnouncements && (
        <div className="portal-panel">
          <div className="portal-panel-header">
            <div className="flex items-center gap-2">
              <Bell size={14} />
              <span>Announcements</span>
            </div>
          </div>
          <div className="p-5">
            <div
              className="prose prose-sm max-w-none text-foreground
                [&_h1]:text-foreground [&_h1]:font-bold [&_h1]:text-lg [&_h1]:mt-3 [&_h1]:mb-1.5
                [&_h2]:text-foreground [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-3 [&_h2]:mb-1.5
                [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mt-2.5 [&_h3]:mb-1
                [&_p]:text-sm [&_p]:text-foreground [&_p]:leading-relaxed [&_p]:my-1.5
                [&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80
                [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ul>li]:text-sm [&_ul>li]:text-foreground
                [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_ol>li]:text-sm [&_ol>li]:text-foreground
                [&_strong]:font-bold [&_em]:italic [&_u]:underline
                [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_table]:text-sm
                [&_th]:bg-secondary/20 [&_th]:text-foreground [&_th]:font-semibold [&_th]:border [&_th]:border-secondary/30 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left
                [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-foreground
                [&_hr]:border-border [&_hr]:my-3
                [&_blockquote]:border-l-4 [&_blockquote]:border-secondary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: announcements }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
