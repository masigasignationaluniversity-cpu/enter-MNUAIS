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
    return parts.join(' — ');
  }
  if (user.role === 'faculty') {
    return user.department ?? 'Faculty';
  }
  if (user.role === 'ocs') {
    return user.department ? `OCS — ${user.department}` : 'Office of the College Secretary';
  }
  return '';
}

export default function DashboardAnnouncements({ portalSettings, user }: DashboardAnnouncementsProps) {
  const { welcomeTitle, welcomeMessage, announcements } = portalSettings;

  const hasWelcomeContent = welcomeTitle || welcomeMessage;
  const hasAnnouncements = announcements && announcements.trim().length > 0;

  if (!hasWelcomeContent && !hasAnnouncements) return null;

  return (
    <div className="space-y-4">
      {/* Welcome Panel — Maroon theme */}
      {hasWelcomeContent && (
        <div className="rounded-lg overflow-hidden border border-primary/30 shadow-sm">
          <div className="bg-gradient-to-r from-primary to-[hsl(348_70%_22%)] px-5 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-foreground/15 border border-primary-foreground/20 flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-primary-foreground" />
            </div>
            <div className="min-w-0">
              {user ? (
                <>
                  <p className="text-primary-foreground font-bold text-base leading-tight">
                    {getGreeting()}, {user.name}!
                  </p>
                  <p className="text-primary-foreground/70 text-xs mt-0.5 truncate">{getUserSubline(user)}</p>
                </>
              ) : (
                <p className="text-primary-foreground font-bold text-base">{welcomeTitle}</p>
              )}
            </div>
          </div>
          {(welcomeTitle || welcomeMessage) && (
            <div className="p-5 bg-primary/5">
              {user && welcomeTitle && (
                <p className="font-semibold text-foreground text-sm mb-1.5">{welcomeTitle}</p>
              )}
              {welcomeMessage && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{welcomeMessage}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Announcements Panel — Green theme */}
      {hasAnnouncements && (
        <div className="rounded-lg overflow-hidden border border-secondary/30 shadow-sm">
          <div className="bg-gradient-to-r from-secondary to-[hsl(142_50%_22%)] px-5 py-3 flex items-center gap-2">
            <Bell size={15} className="text-secondary-foreground" />
            <span className="text-secondary-foreground font-bold text-sm">Announcements</span>
          </div>
          <div className="p-5 bg-secondary/5">
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
