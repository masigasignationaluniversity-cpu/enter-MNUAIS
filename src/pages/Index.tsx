import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck, BookOpen, Users, User } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const portals = [
  {
    role: 'admin',
    label: 'Administrator',
    desc: 'Manage terms, control enrollment & evaluation periods, oversee all system activity.',
    icon: <ShieldCheck size={32} />,
    path: '/admin',
    color: 'from-maroon-700 to-maroon-600',
    badge: 'Full Access',
  },
  {
    role: 'ocs',
    label: 'OCS Portal',
    desc: 'Add courses and sections, manage slots, assign faculty, process student OCS consents.',
    icon: <BookOpen size={32} />,
    path: '/ocs',
    color: 'from-green-700 to-green-600',
    badge: 'OCS Staff',
  },
  {
    role: 'faculty',
    label: 'Faculty Portal',
    desc: 'View assigned classes, encode grades, manage consents, and review student evaluations.',
    icon: <Users size={32} />,
    path: '/faculty',
    color: 'from-maroon-600 to-maroon-500',
    badge: 'Instructor',
  },
  {
    role: 'student',
    label: 'Student Portal',
    desc: 'Enlist in classes, manage consents, view grades, submit evaluations, and track GWA.',
    icon: <User size={32} />,
    path: '/student',
    color: 'from-green-600 to-green-500',
    badge: 'Student',
  },
];

export default function Index() {
  const navigate = useNavigate();

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
        <Badge className="bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30">
          AY 2024-2025 • 2nd Semester
        </Badge>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
            Academic Information System
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto">
            Select your portal to access your academic tools and resources.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl animate-fade-in">
          {portals.map(portal => (
            <Card
              key={portal.role}
              className="portal-card cursor-pointer border-0 overflow-hidden bg-card/10 backdrop-blur-sm border border-primary-foreground/20"
              onClick={() => navigate(portal.path)}
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

        {/* Demo credentials */}
        <div className="mt-10 bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 rounded-xl p-5 w-full max-w-lg animate-fade-in">
          <p className="text-primary-foreground font-semibold text-sm mb-3 text-center">Demo Credentials</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-primary-foreground/80">
            <div className="bg-primary-foreground/10 rounded-lg p-2"><span className="font-semibold">Admin:</span> admin / admin123</div>
            <div className="bg-primary-foreground/10 rounded-lg p-2"><span className="font-semibold">OCS:</span> ocs1 / ocs123</div>
            <div className="bg-primary-foreground/10 rounded-lg p-2"><span className="font-semibold">Faculty:</span> faculty1 / faculty123</div>
            <div className="bg-primary-foreground/10 rounded-lg p-2"><span className="font-semibold">Student:</span> student1 / student123</div>
          </div>
        </div>
      </div>

      <footer className="text-center py-4 text-primary-foreground/40 text-xs">
        University Academic Information System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
