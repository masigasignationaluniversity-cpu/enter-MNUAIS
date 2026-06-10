import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck, BookOpen, Users, User, ChevronRight, Building2 } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useApp } from '../contexts/AppContext';

const portals = [
  {
    role: 'admin',
    label: 'Administrator',
    desc: 'Manage terms, control enrollment & evaluation periods, oversee all system activity.',
    icon: <ShieldCheck size={30} />,
    badge: 'Full Access',
    features: ['Term Control', 'User Management', 'System Settings'],
    gradient: 'from-[hsl(348,58%,20%)] to-[hsl(348,52%,32%)]',
    accentLight: 'hsl(348,52%,72%)',
  },
  {
    role: 'ocs',
    label: 'OCS Portal',
    desc: 'Add courses and sections, manage slots, assign faculty, process student OCS consents.',
    icon: <BookOpen size={30} />,
    badge: 'OCS Staff',
    features: ['Sections & Slots', 'Grade Management', 'Student Records'],
    gradient: 'from-[hsl(158,46%,18%)] to-[hsl(158,42%,28%)]',
    accentLight: 'hsl(158,48%,65%)',
  },
  {
    role: 'faculty',
    label: 'Faculty Portal',
    desc: 'View assigned classes, encode grades, manage consents, and review student evaluations.',
    icon: <Users size={30} />,
    badge: 'Instructor',
    features: ['Grade Encoding', 'Class Roster', 'Evaluations'],
    gradient: 'from-[hsl(250,50%,22%)] to-[hsl(250,44%,34%)]',
    accentLight: 'hsl(250,55%,72%)',
  },
  {
    role: 'student',
    label: 'Student Portal',
    desc: 'Enlist in classes, manage consents, view grades, submit evaluations, and track GWA.',
    icon: <User size={30} />,
    badge: 'Student',
    features: ['Course Enlistment', 'My Grades', 'Plan of Study'],
    gradient: 'from-[hsl(200,55%,20%)] to-[hsl(200,50%,30%)]',
    accentLight: 'hsl(200,60%,70%)',
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { state } = useApp();
  const activeTerm = state.terms.find(t => t.isActive);
  const ps = state.portalSettings;

  return (
    <div className="min-h-full flex flex-col relative overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="portal-orb portal-orb-1" />
        <div className="portal-orb portal-orb-2" />
      </div>
      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 100% / 0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0">
            {ps.logoUrl
              ? <img src={ps.logoUrl} alt="Logo" className="w-full h-full object-cover" crossOrigin="anonymous" />
              : <GraduationCap size={20} className="text-white" />
            }
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">{ps.portalName}</p>
            {ps.portalTagline && <p className="text-white/50 text-xs">{ps.portalTagline}</p>}
          </div>
        </div>
        {activeTerm ? (
          <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-white/80 text-xs font-medium">{activeTerm.academicYear} &bull; {activeTerm.semester} Sem</span>
          </div>
        ) : (
          <Badge className="bg-white/10 text-white/50 border border-white/15">No Active Term</Badge>
        )}
      </header>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">

        {/* Institution tag */}
        <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6 animate-fade-in">
          <Building2 size={13} className="text-white/60" />
          <span className="text-white/70 text-xs font-medium">{ps.institutionName}</span>
        </div>

        {/* Title */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 leading-[1.1] tracking-tight">
            {ps.institutionName}
          </h1>
          <p className="text-white/60 text-base sm:text-lg font-medium">{ps.portalTagline || 'Academic Information System'}</p>
          <p className="text-white/40 text-sm mt-2">Select your portal to access your academic tools</p>
        </div>

        {/* Portal cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 w-full max-w-5xl animate-fade-in">
          {portals.map((portal, i) => (
            <button
              key={portal.role}
              onClick={() => navigate('/login')}
              className="group text-left rounded-2xl overflow-hidden border border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Top gradient area */}
              <div className={`bg-gradient-to-br ${portal.gradient} p-6 relative overflow-hidden`}>
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
                <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-white/5" />

                <div className="relative z-10 flex flex-col gap-4">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner group-hover:bg-white/20 transition-colors">
                    {portal.icon}
                  </div>
                  <div>
                    <Badge className="bg-white/15 border-0 text-white text-xs mb-2 font-medium">{portal.badge}</Badge>
                    <h2 className="text-white font-bold text-lg leading-tight">{portal.label}</h2>
                  </div>
                </div>
              </div>

              {/* Bottom info area */}
              <div className="p-4 bg-card border-t border-border/50">
                <p className="text-muted-foreground text-xs leading-relaxed mb-3">{portal.desc}</p>
                {/* Feature tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {portal.features.map(f => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium border border-border/60">
                      {f}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-primary text-sm font-semibold">
                  <span>Enter Portal</span>
                  <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Department Head note */}
        <p className="text-white/30 text-xs mt-6 text-center animate-fade-in">
          Department Head? Use the Faculty portal login and select your role.
        </p>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-white/25 text-xs px-4">
        {ps.institutionName} {ps.portalTagline} &copy; {new Date().getFullYear()} &bull; Academic Information System
      </footer>
    </div>
  );
}
