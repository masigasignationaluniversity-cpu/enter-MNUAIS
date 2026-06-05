import { useState } from 'react';
import PortalLayout from '@/components/shared/PortalLayout';
import { useApp } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, BookOpen, ClipboardList, Clock, CheckCircle, Video } from 'lucide-react';
import VideoTutorialModal from '../shared/VideoTutorialModal';

export default function DeptHeadDashboard() {
  const { state } = useApp();
  const navigate = useNavigate();
  const me = state.currentUser!;
  const dept = me.department ?? '';
  const [showTutorial, setShowTutorial] = useState(false);

  const activeTerm = state.terms.find(t => t.isActive);

  // Dept consent stats for active term
  const deptCourseIds = new Set(
    dept ? state.courses.filter(c => c.department === dept && c.requiresDeptConsent).map(c => c.id) : []
  );
  const deptConsentSections = activeTerm
    ? state.sections.filter(s => s.termId === activeTerm.id && deptCourseIds.has(s.courseId))
    : [];
  const deptConsents = activeTerm
    ? state.consents.filter(c => c.termId === activeTerm.id && deptConsentSections.some(s => s.id === c.sectionId) && c.deptConsentStatus !== 'not_requested')
    : [];
  const pendingConsents = deptConsents.filter(c => c.deptConsentStatus === 'pending').length;
  const approvedConsents = deptConsents.filter(c => c.deptConsentStatus === 'approved').length;

  // Course & section counts
  const deptCourseCount = dept ? state.courses.filter(c => c.department === dept).length : 0;
  const deptSectionCount = activeTerm ? state.sections.filter(s => s.termId === activeTerm.id && state.courses.some(c => c.id === s.courseId && c.department === dept)).length : 0;

  const stats = [
    { label: 'Pending Dept Consents', value: pendingConsents, icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', path: '/depthead/consents' },
    { label: 'Approved Consents', value: approvedConsents, icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200', path: '/depthead/consents' },
    { label: 'Dept Courses', value: deptCourseCount, icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-200', path: '/depthead/courses' },
    { label: 'Active Sections', value: deptSectionCount, icon: ClipboardList, color: 'text-primary bg-primary/5 border-primary/20', path: '/depthead/sections' },
  ];

  return (
    <PortalLayout role="department_head" userName={me.name}>
      <div className="space-y-6">
        {showTutorial && <VideoTutorialModal onClose={() => setShowTutorial(false)} />}
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Department Head Dashboard</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {dept ? dept : 'No department assigned'} · {activeTerm?.name ?? 'No active term'}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => setShowTutorial(true)}>
                <Video size={14} /> Video Tutorial
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => window.open('/guide', '_blank')}>
                <BookOpen size={14} /> User Guide / Gabay
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                onClick={() => navigate(s.path)}
                className={`rounded-xl border p-4 text-left hover:shadow-md transition-shadow ${s.color}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-5 h-5 opacity-70" />
                  {s.label === 'Pending Dept Consents' && s.value > 0 && (
                    <Badge className="bg-yellow-400 text-yellow-900 border-0 text-xs">{s.value}</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs mt-0.5 opacity-80">{s.label}</p>
              </button>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/depthead/consents')}
            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-sm">Department Consent</p>
              <p className="text-xs text-muted-foreground">Review and act on consent requests</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/depthead/sections')}
            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="font-semibold text-sm">Manage Sections</p>
              <p className="text-xs text-muted-foreground">Add and edit sections for your department</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/depthead/courses')}
            className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Manage Courses</p>
              <p className="text-xs text-muted-foreground">Add and edit courses for your department</p>
            </div>
          </button>
        </div>

        {pendingConsents > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span><strong>{pendingConsents} department consent request(s)</strong> are awaiting your review.</span>
            <Button size="sm" variant="outline" className="ml-auto border-yellow-400 text-yellow-800 hover:bg-yellow-100 text-xs"
              onClick={() => navigate('/depthead/consents')}>
              Review
            </Button>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
