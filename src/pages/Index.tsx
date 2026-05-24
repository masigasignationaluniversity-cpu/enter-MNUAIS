import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck, BookOpen, Users, User } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useApp } from '../contexts/AppContext';

const portals = [
  {
    role: 'admin',
    label: 'Administrator',
    desc: 'Manage terms, control enrollment & evaluation periods, oversee all system activity.',
    icon: <ShieldCheck size={32} />,
    color: 'from-maroon-700 to-maroon-600',
    badge: 'Full Access',
  },
  {
    role: 'ocs',
    label: 'OCS Portal',
    desc: 'Add courses and sections, manage slots, assign faculty, process student OCS consents.',
    icon: <BookOpen size={32} />,
    color: 'from-green-700 to-green-600',
    badge: 'OCS Staff',
  },
  {
    role: 'faculty',
    label: 'Faculty Portal',
    desc: 'View assigned classes, encode grades, manage consents, and review student evaluations.',
    icon: <Users size={32} />,
    color: 'from-maroon-600 to-maroon-500',
    badge: 'Instructor',
  },
  {
    role: 'student',
    label: 'Student Portal',
    desc: 'Enlist in classes, manage consents, view grades, submit evaluations, and track GWA.',
    icon: <User size={32} />,
    color: 'from-green-600 to-green-500',
    badge: 'Student',
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { state } = useApp();
  const activeTerm = state.terms.find(t => t.isActive);

  return (
    <div className="min-h-full flex flex-col" style={{ background: 'var(--gradient-hero)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 border border-primary-foreground/30 flex items-center justify-center">
            <GraduationCap size={22} className="text-primary-foreground" />
          </div>
          <div>
            <p className="text-primary-foreground font-bold text-lg leading-tight">University AIS</p>
            <p className="text-primary-foreground/60 text-xs">Academic Information System</p>
          </div>
        </div>
        {activeTerm ? (
          <Badge className="bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30">
            {activeTerm.academicYear} &bull; {activeTerm.semester} Sem
            <span className="ml-2 w-2 h-2 rounded-full bg-green-400 inline-block" />
          </Badge>
        ) : (
          <Badge className="bg-primary-foreground/10 text-primary-foreground/60 border border-primary-foreground/20">
            No Active Term
          </Badge>
        )}
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
            Academic Information System
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">
            Select your portal or sign in directly to access your academic tools.
          </p>
          {activeTerm && (
            <p className="text-primary-foreground/50 text-sm mt-2">
              Current term: <span className="font-semibold text-primary-foreground/70">{activeTerm.name}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl animate-fade-in mb-8">
          {portals.map(portal => (
            <Card
              key={portal.role}
              className="portal-card cursor-pointer border-0 overflow-hidden bg-card/10 backdrop-blur-sm border border-primary-foreground/20"
              onClick={() => navigate('/login')}
            >
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${portal.color} p-6 flex flex-col items-center text-center gap-3`}>
                  <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 border border-primary-foreground/30 flex items-center justify-center text-primary-foreground">
                    {portal.icon}
                  </div>
                  <div>
                    <Badge className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs mb-2">
                      {portal.badge}
                    </Badge>
                    <h2 className="text-primary-foreground font-bold text-lg">{portal.label}</h2>
                  </div>
                </div>
                <div className="p-4 bg-card">
                  <p className="text-muted-foreground text-sm text-center leading-relaxed">{portal.desc}</p>
                  <div className="mt-3 w-full py-2 rounded-lg bg-primary text-primary-foreground text-center text-sm font-semibold hover:opacity-90 transition-opacity">
                    Enter Portal
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Single Sign In button */}
        <div className="animate-fade-in">
          <Button
            size="lg"
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold px-10 shadow-lg"
            onClick={() => navigate('/login')}
          >
            Sign In to Your Portal
          </Button>
        </div>
      </div>

      <footer className="text-center py-4 text-primary-foreground/40 text-xs">
        University Academic Information System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
