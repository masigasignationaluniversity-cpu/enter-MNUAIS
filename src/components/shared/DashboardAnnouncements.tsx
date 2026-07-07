import { Bell, Megaphone, User } from 'lucide-react';
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

  if (!hasWelcomeContent && !hasAnnouncements && !user) return null;

  const initials = user
    ? user.name.split(' ').map(n => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
    : '?';
  const subline = user ? getUserSubline(user) : '';

  return (
    <div className="space-y-4">
      {/* ── Welcome Panel — Login theme ── */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ background: 'hsl(var(--primary))' }}
      >
        {/* Dot texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative z-10 p-4 sm:p-5">
          {/* White card */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">

            {/* Card header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid hsl(var(--border) / 0.6)' }}
            >
              {/* Avatar + greeting */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: 'hsl(var(--secondary))' }}
                >
                  {user
                    ? <span className="text-white font-extrabold text-base leading-none select-none">{initials}</span>
                    : <User size={20} className="text-white" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {getGreeting()}
                  </p>
                  <h2 className="font-extrabold text-base leading-tight truncate"
                    style={{ color: 'hsl(var(--foreground))' }}>
                    {user ? user.name : (welcomeTitle ?? 'Welcome')}
                  </h2>
                  {subline && (
                    <p className="text-xs truncate mt-0.5"
                      style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {subline}
                    </p>
                  )}
                </div>
              </div>

              {/* Right badge */}
              {hasAnnouncements ? (
                <div
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 flex-shrink-0 text-white"
                  style={{ background: 'hsl(var(--secondary))' }}
                >
                  <Bell size={12} />
                  Announcements
                </div>
              ) : (
                <div
                  className="hidden sm:flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 flex-shrink-0"
                  style={{ color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}
                >
                  <Megaphone size={12} />
                  {portalSettings.portalName}
                </div>
              )}
            </div>

            {/* Card content */}
            {(hasWelcomeContent || hasAnnouncements) && (
              <div className="px-5 py-4">
                {hasWelcomeContent && (
                  <div className={hasAnnouncements ? 'mb-4 pb-4' : ''} style={hasAnnouncements ? { borderBottom: '1px solid hsl(var(--border) / 0.6)' } : {}}>
                    {welcomeTitle && !user && (
                      <h3 className="font-bold text-sm leading-snug" style={{ color: 'hsl(var(--foreground))' }}>
                        {welcomeTitle}
                      </h3>
                    )}
                    {user && welcomeTitle && (
                      <h3 className="font-bold text-sm leading-snug" style={{ color: 'hsl(var(--foreground))' }}>
                        {welcomeTitle}
                      </h3>
                    )}
                    {welcomeMessage && (
                      <p className="text-sm leading-relaxed mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {welcomeMessage}
                      </p>
                    )}
                  </div>
                )}

                {hasAnnouncements && (
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
