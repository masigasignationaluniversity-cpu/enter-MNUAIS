import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  LayoutDashboard, BookOpen, Users, LogOut,
  Menu, X, GraduationCap, ClipboardList, FileText,
  CalendarDays, Award, Star, BookMarked, BarChart3,
  UserCheck, ChevronRight, Unlock, FileBarChart, Settings, Building2, DoorOpen, ShieldAlert, FilePen, RefreshCw, Megaphone, PenSquare, ChevronLeft, KeyRound, Send, Layers, TrendingUp, ChevronDown, DollarSign, UserCog, HandCoins,
} from 'lucide-react';
import type { Role } from '../../lib/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const navGroupsByRole: Record<Role, NavGroup[]> = {
  admin: [
    { label: 'Dashboard', icon: <LayoutDashboard size={16} />, items: [{ label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={16} /> }] },
    { label: 'Dashboard Content', icon: <Megaphone size={16} />, items: [{ label: 'Dashboard Content', path: '/admin/dashboard-content', icon: <Megaphone size={16} /> }] },
    { label: 'Term Control', icon: <CalendarDays size={16} />, items: [{ label: 'Term Control', path: '/admin/terms', icon: <CalendarDays size={16} /> }] },
    { label: 'User Management', icon: <Users size={16} />, items: [{ label: 'User Management', path: '/admin/users', icon: <Users size={16} /> }] },
    { label: 'Report Cards', icon: <FileBarChart size={16} />, items: [{ label: 'Report Cards', path: '/admin/reportcard', icon: <FileBarChart size={16} /> }] },
    { label: 'Academic Units', icon: <Building2 size={16} />, items: [{ label: 'Academic Units', path: '/admin/academic-units', icon: <Building2 size={16} /> }] },
    { label: 'Rooms', icon: <DoorOpen size={16} />, items: [{ label: 'Rooms', path: '/admin/rooms', icon: <DoorOpen size={16} /> }] },
    { label: 'Password Tickets', icon: <KeyRound size={16} />, items: [{ label: 'Password Tickets', path: '/admin/password-tickets', icon: <KeyRound size={16} /> }] },
    { label: 'Graduation', icon: <GraduationCap size={16} />, items: [{ label: 'Graduation', path: '/admin/graduation-settings', icon: <GraduationCap size={16} /> }] },
    { label: 'Fee Schedule', icon: <DollarSign size={16} />, items: [{ label: 'Fee Schedule', path: '/admin/fees', icon: <DollarSign size={16} /> }] },
    { label: 'Portal Settings', icon: <Settings size={16} />, items: [{ label: 'Portal Settings', path: '/admin/portal-settings', icon: <Settings size={16} /> }] },
  ],
  ocs: [
    { label: 'Dashboard', icon: <LayoutDashboard size={16} />, items: [{ label: 'Dashboard', path: '/ocs/dashboard', icon: <LayoutDashboard size={16} /> }] },
    { label: 'Course Overview', icon: <BookOpen size={16} />, items: [{ label: 'Course Overview', path: '/ocs/course-overview', icon: <BookOpen size={16} /> }] },
    { label: 'Consents', icon: <UserCheck size={16} />, items: [
      { label: 'OCS Consents', path: '/ocs/consents', icon: <UserCheck size={16} /> },
    ]},
    { label: 'Student Management', icon: <Users size={16} />, items: [
      { label: 'Students', path: '/ocs/students', icon: <Users size={16} /> },
      { label: 'GWA Report', path: '/ocs/gwa-report', icon: <TrendingUp size={16} /> },
      { label: 'Grade & Enrollment', path: '/ocs/grade-management', icon: <PenSquare size={16} /> },
      { label: 'Graduation Applications', path: '/ocs/graduation-applications', icon: <Send size={16} /> },
    ]},
    { label: 'College Management', icon: <GraduationCap size={16} />, items: [
      { label: 'Plan of Study', path: '/ocs/plan-of-study', icon: <GraduationCap size={16} /> },
      { label: 'Specialization', path: '/ocs/specialization', icon: <Layers size={16} /> },
      { label: 'GE Elective Requests', path: '/ocs/ge-elective', icon: <BookMarked size={16} /> },
    ]},
    { label: 'Requests', icon: <FileText size={16} />, items: [
      { label: 'Underload Applications', path: '/ocs/underload', icon: <FileText size={16} /> },
      { label: 'Enrollment Payments', path: '/ocs/payments', icon: <DollarSign size={16} /> },
      { label: 'Student Loans', path: '/ocs/student-loans', icon: <HandCoins size={16} /> },
      { label: 'Student Adviser', path: '/ocs/adviser', icon: <UserCog size={16} /> },
      { label: 'Reconsideration', path: '/ocs/reconsideration', icon: <ShieldAlert size={16} /> },
      { label: 'Change/Add/Drop', path: '/ocs/change-drop', icon: <RefreshCw size={16} /> },
    ]},
  ],
  faculty: [
    { label: 'Dashboard', icon: <LayoutDashboard size={16} />, items: [{ label: 'Dashboard', path: '/faculty/dashboard', icon: <LayoutDashboard size={16} /> }] },
    { label: 'Class Management', icon: <BookMarked size={16} />, items: [
      { label: 'My Classes', path: '/faculty/classes', icon: <BookMarked size={16} /> },
      { label: 'My Timetable', path: '/faculty/timetable', icon: <CalendarDays size={16} /> },
    ]},
    { label: 'Grade Management', icon: <Award size={16} />, items: [
      { label: 'Grade Encoding', path: '/faculty/grades', icon: <Award size={16} /> },
      { label: 'Removal/Completion', path: '/faculty/removal-grades', icon: <FilePen size={16} /> },
    ]},
    { label: 'Consents', icon: <ClipboardList size={16} />, items: [
      { label: 'COI Consents', path: '/faculty/consents', icon: <ClipboardList size={16} /> },
      { label: 'Prerogatives', path: '/faculty/prerogatives', icon: <Unlock size={16} /> },
    ]},
    { label: 'Student Evaluations', icon: <Star size={16} />, items: [{ label: 'Student Evaluations', path: '/faculty/evaluations', icon: <Star size={16} /> }] },
    { label: 'Advisees', icon: <UserCog size={16} />, items: [{ label: 'My Advisees', path: '/faculty/advisees', icon: <UserCog size={16} /> }] },
  ],
  student: [
    { label: 'Dashboard', icon: <LayoutDashboard size={16} />, items: [{ label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={16} /> }] },
    { label: 'Enrollment', icon: <BookOpen size={16} />, items: [
      { label: 'My Consents', path: '/student/consent', icon: <FileText size={16} /> },
      { label: 'Plan of Study', path: '/student/plan-of-study', icon: <GraduationCap size={16} /> },
      { label: 'Specialization', path: '/student/specialization', icon: <Layers size={16} /> },
      { label: 'GE Electives', path: '/student/ge-elective', icon: <BookMarked size={16} /> },
      { label: 'Enlistment', path: '/student/enlistment', icon: <BookOpen size={16} /> },
      { label: 'Prerogatives', path: '/student/prerogatives', icon: <Unlock size={16} /> },
    ]},
    { label: 'My Grades', icon: <Award size={16} />, items: [{ label: 'My Grades', path: '/student/grades', icon: <Award size={16} /> }] },
    { label: 'SET', icon: <Star size={16} />, items: [{ label: 'SET', path: '/student/evaluation', icon: <Star size={16} /> }] },
    { label: 'My Profile', icon: <BarChart3 size={16} />, items: [{ label: 'My Profile', path: '/student/profile', icon: <BarChart3 size={16} /> }] },
  ],
  department_head: [
    { label: 'Dashboard', icon: <LayoutDashboard size={16} />, items: [{ label: 'Dashboard', path: '/depthead/dashboard', icon: <LayoutDashboard size={16} /> }] },
    { label: 'Consents', icon: <UserCheck size={16} />, items: [
      { label: 'Department Consents', path: '/depthead/consents', icon: <UserCheck size={16} /> },
    ]},
    { label: 'Course Management', icon: <BookOpen size={16} />, items: [
      { label: 'Sections', path: '/depthead/sections', icon: <ClipboardList size={16} /> },
      { label: 'Courses', path: '/depthead/courses', icon: <BookOpen size={16} /> },
    ]},
  ],
};

type BannerDef = { icon: React.ReactNode; desc: string; pills: string[] };
const bannerMap: Record<string, BannerDef> = {
  // Student
  '/student/enlistment':   { icon: <BookOpen className="w-5 h-5"/>, desc: 'Browse available course sections and manage your enlistment for the current term.', pills: ['Browse course offerings','Bookmark sections','Track enlistment status'] },
  '/student/prerogatives': { icon: <Unlock className="w-5 h-5"/>, desc: 'Request special admission into full or restricted sections for this term.', pills: ['Submit prerog requests','Track approval status'] },
  '/student/consent':      { icon: <FileText className="w-5 h-5"/>, desc: 'Respond to enrollment consent requests from faculty or OCS.', pills: ['View pending consents','Accept or decline requests'] },
  '/student/grades':       { icon: <Award className="w-5 h-5"/>, desc: 'View your official grades and academic performance across all terms.', pills: ['Term-by-term grades','Track GWA','View completion rate'] },
  '/student/evaluation':   { icon: <Star className="w-5 h-5"/>, desc: 'Evaluate faculty teaching performance for the current semester.', pills: ['Submit evaluations','Rate teaching quality','Anonymous responses'] },
  '/student/plan-of-study':{ icon: <GraduationCap className="w-5 h-5"/>, desc: 'Your academic roadmap — monitor passed, in-progress, and pending course requirements for graduation.', pills: ['Track required courses','View grade history','Apply for graduation'] },
  '/student/specialization': { icon: <Layers className="w-5 h-5"/>, desc: 'Select and submit your specialization course plan for OCS approval. Your approved plan unlocks enrollment in Specialized courses.', pills: ['Choose specialization','Submit for approval','Track request status'] },
  '/student/ge-elective':    { icon: <BookMarked className="w-5 h-5"/>, desc: 'Select your Elective GE courses and submit a plan for OCS approval. An approved plan is required to enlist in Elective GE courses.', pills: ['Browse GE courses','Submit plan','Track approval'] },
  // Faculty
  '/faculty/classes':       { icon: <BookMarked className="w-5 h-5"/>, desc: 'View your class rosters and manage enrolled students for each section.', pills: ['View class lists','Export student CSV','Check enlistment counts'] },
  '/faculty/timetable':     { icon: <CalendarDays className="w-5 h-5"/>, desc: 'View your weekly class schedule and room assignments for the current term.', pills: ['Weekly schedule view','Room info','Lab schedules'] },
  '/faculty/grades':        { icon: <Award className="w-5 h-5"/>, desc: 'Encode and submit official grades for your assigned course sections.', pills: ['Enter grades','Submit to OCS','Export grade sheets'] },
  '/faculty/prerogatives':  { icon: <Unlock className="w-5 h-5"/>, desc: 'Review and act on student prerogative requests for your sections.', pills: ['Approve/deny requests','Override slot limits'] },
  '/faculty/consents':      { icon: <ClipboardList className="w-5 h-5"/>, desc: 'Manage student enrollment consent requests for your courses.', pills: ['View pending consents','Approve/deny enrollments'] },
  '/faculty/removal-grades':{ icon: <FilePen className="w-5 h-5"/>, desc: 'Submit grade changes for incomplete, conditional, and removal grade assessments.', pills: ['Grade removal','Completion submissions','INC resolution'] },
  '/faculty/evaluations':   { icon: <Star className="w-5 h-5"/>, desc: 'View anonymized student evaluations submitted for your courses this term.', pills: ['View ratings','Performance insights','Anonymous feedback'] },
  '/faculty/advisees':      { icon: <UserCog className="w-5 h-5"/>, desc: 'View the list of students assigned to you as adviser. Monitor their academic progress, GWA, year level, and enrollment status.', pills: ['Advisee list','Academic progress','GWA & year level'] },
  // OCS
  '/ocs/course-overview':   { icon: <BookOpen className="w-5 h-5"/>, desc: 'View and monitor all active course sections across the institution.', pills: ['Sections overview','Enrollment data','Faculty assignments'] },
  '/ocs/consents':          { icon: <UserCheck className="w-5 h-5"/>, desc: 'Review and process student enrollment consent requests from all colleges.', pills: ['Process consents','Approve/deny enrollments'] },
  '/ocs/students':          { icon: <Users className="w-5 h-5"/>, desc: 'Access student academic records, grades, and generate official transcripts.', pills: ['Search students','Download TOR','Export grades'] },
  '/ocs/gwa-report':        { icon: <TrendingUp className="w-5 h-5"/>, desc: 'Automatic GWA summary per college and program each term, with honorific scholarships and Latin honors for graduating students.', pills: ['Per college/program','Honorifics & Laude','Download A4 PDF'] },
  '/ocs/grade-management':  { icon: <PenSquare className="w-5 h-5"/>, desc: 'Manage and override student grades and enrollment records as needed.', pills: ['Override grades','Enroll/drop students','Submit corrections'] },
  '/ocs/plan-of-study':     { icon: <GraduationCap className="w-5 h-5"/>, desc: 'Configure required courses and review student progress towards degree completion.', pills: ['Set required courses','View student progress','Manage degree plans'] },
  '/ocs/specialization':    { icon: <Layers className="w-5 h-5"/>, desc: 'Review and process student specialization plan requests. Approve or deny submitted course selections.', pills: ['Review requests','Approve/deny plans','Track student specs'] },
  '/ocs/ge-elective':       { icon: <BookMarked className="w-5 h-5"/>, desc: 'Review and process student GE Elective plan requests. Approve or deny submitted Elective GE course selections.', pills: ['Review requests','Approve/deny plans','Track GE plans'] },
  '/ocs/underload':         { icon: <FileText className="w-5 h-5"/>, desc: 'Review and process student underload applications for the active term. Approve or deny students with fewer than 15 enlisted units.', pills: ['Review applications','Approve/deny','Track status'] },
  '/ocs/payments':          { icon: <DollarSign className="w-5 h-5"/>, desc: 'Track and record student enrollment fee payments. Mark students as paid, free tuition (RA 10931), or unpaid. Unpaid students are held from enlisting.', pills: ['Record payments','RA 10931','Payment status'] },
  '/ocs/student-loans':     { icon: <HandCoins className="w-5 h-5"/>, desc: 'Review and approve student loan applications submitted from an enrollment hold. Approving lifts the hold and carries the unpaid balance to the succeeding term.', pills: ['Approve/deny loans','Carry balance forward'] },
  '/ocs/adviser':           { icon: <UserCog className="w-5 h-5"/>, desc: 'Assign faculty advisers to students within your college. Each student can be assigned one adviser who can view their academic progress.', pills: ['Assign advisers','Filter by college','Faculty list'] },
  '/ocs/graduation-applications': { icon: <Send className="w-5 h-5"/>, desc: 'Review and process student applications for graduation clearance.', pills: ['Approve/deny applications','View course records','Track status'] },
  '/ocs/reconsideration':   { icon: <ShieldAlert className="w-5 h-5"/>, desc: 'Review and decide on student requests to reconsider their official grades.', pills: ['Process requests','Submit decisions','Notify students'] },
  '/ocs/change-drop':       { icon: <RefreshCw className="w-5 h-5"/>, desc: 'Manage student requests to change, add, or drop currently enrolled courses.', pills: ['Approve/deny changes','Track request history'] },
  '/ocs/courses':           { icon: <BookOpen className="w-5 h-5"/>, desc: 'Manage course catalog entries, units, prerequisites, and course types.', pills: ['Add/edit courses','Set prerequisites','Configure co-reqs'] },
  '/ocs/sections':          { icon: <ClipboardList className="w-5 h-5"/>, desc: 'Create and manage course sections, schedules, and faculty assignments.', pills: ['Create sections','Assign faculty','Set schedules'] },
  '/ocs/prerogatives':      { icon: <Unlock className="w-5 h-5"/>, desc: 'Review prerogative requests submitted by students for full or restricted sections.', pills: ['View all requests','Approve/deny','Track status'] },
  // Admin
  '/admin/terms':             { icon: <CalendarDays className="w-5 h-5"/>, desc: 'Create and manage academic terms, enlistment periods, and scheduling windows.', pills: ['Create terms','Set enlistment windows','Control active term'] },
  '/admin/fees':              { icon: <DollarSign className="w-5 h-5"/>, desc: 'Configure enrollment fee amounts per term for the Certificate of Registration (Form 5). Supports tuition per unit, lab fees, and all miscellaneous school fees.', pills: ['Set tuition rates','Configure school fees','Preview assessment'] },
  '/admin/users':             { icon: <Users className="w-5 h-5"/>, desc: 'Manage all student, faculty, OCS, and administrator user accounts.', pills: ['Create/edit users','Assign roles','Reset passwords'] },
  '/admin/reportcard':        { icon: <FileBarChart className="w-5 h-5"/>, desc: 'Generate and view student report cards and academic summaries by term.', pills: ['Generate reports','Export PDF','Filter by college'] },
  '/admin/academic-units':    { icon: <Building2 className="w-5 h-5"/>, desc: 'Manage colleges, departments, and degree programs across the institution.', pills: ['Manage colleges','Set degree programs','Configure departments'] },
  '/admin/rooms':             { icon: <DoorOpen className="w-5 h-5"/>, desc: 'Manage classrooms, laboratories, and room assignments for course sections.', pills: ['Add/edit rooms','View availability','Assign to sections'] },
  '/admin/password-tickets':  { icon: <KeyRound className="w-5 h-5"/>, desc: 'Review and resolve student password reset requests and account issues.', pills: ['View tickets','Reset passwords','Track resolutions'] },
  '/admin/graduation-settings':{ icon: <GraduationCap className="w-5 h-5"/>, desc: 'Configure graduation eligibility requirements, honors thresholds, and degree rules.', pills: ['Set requirements','Configure honors','Manage eligibility'] },
  '/admin/portal-settings':   { icon: <Settings className="w-5 h-5"/>, desc: 'Customize portal appearance, institution name, logo, and global settings.', pills: ['Edit portal name','Upload logo','Configure tagline'] },
  '/admin/dashboard-content': { icon: <Megaphone className="w-5 h-5"/>, desc: 'Manage announcements and content displayed on all portal dashboards.', pills: ['Post announcements','Manage visibility'] },
  // DeptHead
  '/depthead/consents':  { icon: <UserCheck className="w-5 h-5"/>, desc: 'Review and approve student enrollment consent requests for your department.', pills: ['Process consents','Track approvals'] },
  '/depthead/sections':  { icon: <ClipboardList className="w-5 h-5"/>, desc: 'Manage course sections and faculty assignments within your department.', pills: ['View sections','Assign faculty','Set schedules'] },
  '/depthead/courses':   { icon: <BookOpen className="w-5 h-5"/>, desc: 'Manage the course curriculum and offerings for your department.', pills: ['Add/edit courses','Set prerequisites','Manage curriculum'] },
};

// Paths that should NOT show the layout banner (have their own or are excluded)
const noBannerPaths = ['/dashboard', '/student/profile', '/student/plan-of-study'];

const roleLabels: Record<Role, string> = {
  admin: 'Administrator',
  ocs: 'OCS Staff',
  faculty: 'Faculty',
  student: 'Student',
  department_head: 'Department Head',
};

const roleBadgeColors: Record<Role, string> = {
  admin: 'bg-primary/10 text-primary border border-primary/20',
  ocs: 'bg-secondary/10 text-secondary border border-secondary/20',
  faculty: 'bg-secondary/10 text-secondary border border-secondary/20',
  student: 'bg-secondary/10 text-secondary border border-secondary/20',
  department_head: 'bg-secondary/10 text-secondary border border-secondary/20',
};

interface PortalLayoutProps {
  children: React.ReactNode;
  title?: string;
  role?: string;
  userName?: string;
}

export default function PortalLayout({ children, title }: PortalLayoutProps) {
  const { state, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const user = state.currentUser;
  const ps = state.portalSettings;

  const navGroups = (() => {
    if (!user) return [];
    const groups = navGroupsByRole[user.role] ?? [];
    if (user.role === 'student') {
      const prog = state.degreePrograms?.find(p => p.name === user.program || p.id === user.program);
      if (prog?.degreeType === 'associate_certificate') {
        return groups.map(g => ({
          ...g,
          items: g.items.filter(item => item.path !== '/student/specialization' && item.path !== '/student/ge-elective'),
        })).filter(g => g.items.length > 0);
      }
      // Masters and Doctorate: remove GE Electives nav item
      if (prog?.degreeType === 'masters' || prog?.degreeType === 'doctorate') {
        return groups.map(g => ({
          ...g,
          items: g.items.filter(item => item.path !== '/student/ge-elective'),
        })).filter(g => g.items.length > 0);
      }
    }
    return groups;
  })();

  const navItems = navGroups.flatMap(g => g.items);

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  // Auto-expand the group that contains the active route
  useEffect(() => {
    const matched = navGroups.find(g =>
      g.items.length > 1 && g.items.some(item =>
        location.pathname === item.path || location.pathname.startsWith(item.path + '/')
      )
    );
    if (matched) setExpandedGroup(matched.label);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!user) {
    return (
      <div className="flex h-full w-full items-center justify-center portal-bg">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading portal…</span>
        </div>
      </div>
    );
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const activeNavItem = navItems.find(item =>
    location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  );
  const effectiveTitle = title ?? activeNavItem?.label;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen(false);
    } else {
      setSidebarOpen(v => !v);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden portal-bg relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="portal-orb portal-orb-1" />
        <div className="portal-orb portal-orb-2" />
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 overflow-hidden
          lg:relative lg:inset-auto lg:z-10 lg:flex-shrink-0
          ${sidebarOpen ? 'w-64' : 'lg:w-[68px]'} w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ background: '#ffffff', borderRight: '1px solid hsl(var(--border))' }}
      >

        {/* ── Brand / Logo ─────────────────────────────────────────── */}
        <div className={`relative z-10 flex items-center gap-3 px-4 py-4 flex-shrink-0 ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}>
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2"
               style={{ borderColor: 'hsl(var(--border))' }}>
            {ps.logoUrl ? (
              <img src={ps.logoUrl} alt="Logo" className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <GraduationCap size={20} className="text-primary" />
            )}
          </div>
          {sidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <p className="text-foreground font-bold text-sm leading-tight truncate">{ps.portalName}</p>
              <p className="text-muted-foreground text-xs truncate leading-snug">{ps.portalTagline}</p>
            </div>
          )}
          {/* Separator */}
          <div className="absolute bottom-0 left-4 right-4 h-px bg-border" />
        </div>

        {/* ── User info ────────────────────────────────────────────── */}
        <div className={`relative z-10 flex-shrink-0 ${sidebarOpen ? 'px-4 py-3.5' : 'lg:py-3 py-3 px-4 lg:px-2'}`}>
          <div className={`flex items-center gap-3 ${!sidebarOpen ? 'lg:justify-center' : ''}`}>
            <div className="relative flex-shrink-0">
              <Avatar className="h-10 w-10 border-2 border-border shadow-sm">
                <AvatarFallback className="text-xs font-bold text-white" style={{ background: 'hsl(var(--secondary))' }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden flex-1">
                <p className="text-foreground text-sm font-semibold truncate leading-tight">{user.name}</p>
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-0.5 tracking-wide ${roleBadgeColors[user.role]}`}>
                  {roleLabels[user.role]}
                </span>
              </div>
            )}
          </div>
          {/* Separator */}
          <div className="absolute bottom-0 left-4 right-4 h-px bg-border" />
        </div>

        {/* ── Hamburger / Collapse toggle ───────────────────────────── */}
        <div className={`relative z-10 flex-shrink-0 px-3 py-2 ${!sidebarOpen ? 'lg:flex lg:justify-center' : ''}`}>
          <button
            onClick={toggleSidebar}
            className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all text-xs font-medium ${!sidebarOpen ? 'lg:w-auto lg:justify-center' : ''}`}
            title={sidebarOpen ? 'Collapse menu' : 'Expand menu'}
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft size={14} className="flex-shrink-0" />
                <span>Collapse</span>
              </>
            ) : (
              <Menu size={15} className="flex-shrink-0" />
            )}
          </button>
        </div>

        {/* ── Navigation ───────────────────────────────────────────── */}
        <nav className="relative z-10 flex-1 overflow-y-auto py-2 px-2.5 space-y-0.5">
          {sidebarOpen && (
            <p className="text-muted-foreground/50 text-[10px] font-bold uppercase tracking-widest px-2.5 pt-1 pb-2 select-none">
              Menu
            </p>
          )}
          {navGroups.map(group => {
            const isSingle = group.items.length === 1;
            const singleItem = group.items[0];
            const isGroupActive = group.items.some(item =>
              location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            );
            const isExpanded = expandedGroup === group.label;

            if (isSingle) {
              // Direct nav button (single-item group)
              return (
                <button
                  key={group.label}
                  onClick={() => { navigate(singleItem.path); setMobileOpen(false); setSidebarOpen(false); }}
                  title={!sidebarOpen ? group.label : undefined}
                  className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 text-sm font-medium relative group
                    ${sidebarOpen ? 'px-3 py-2.5' : 'lg:justify-center lg:px-0 lg:py-2.5 px-3 py-2.5'}
                    ${isGroupActive
                      ? 'text-white shadow-sm'
                      : 'text-foreground/70 hover:bg-secondary/10 hover:text-secondary'
                    }`}
                  style={isGroupActive ? { background: 'hsl(var(--secondary))' } : undefined}
                >
                  <span className={`flex-shrink-0 transition-transform duration-150 ${isGroupActive ? 'scale-110' : ''} ${!sidebarOpen ? 'lg:mx-auto' : ''}`}>{group.icon}</span>
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left truncate">{group.label}</span>
                      {isGroupActive && <ChevronRight size={12} className="flex-shrink-0 opacity-60" />}
                    </>
                  )}
                  {!sidebarOpen && (
                    <span className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-lg shadow-lg border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {group.label}
                    </span>
                  )}
                </button>
              );
            }

            // Collapsible group (multi-item)
            return (
              <div key={group.label}>
                <button
                  onClick={() => {
                    if (!sidebarOpen) { setSidebarOpen(true); setExpandedGroup(group.label); }
                    else setExpandedGroup(isExpanded ? null : group.label);
                    // Do NOT close mobile sidebar here — user still needs to click a sub-item
                  }}
                  title={!sidebarOpen ? group.label : undefined}
                  className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 text-sm font-medium relative group
                    ${sidebarOpen ? 'px-3 py-2.5' : 'lg:justify-center lg:px-0 lg:py-2.5 px-3 py-2.5'}
                    ${isGroupActive
                      ? 'text-secondary bg-secondary/10'
                      : 'text-foreground/70 hover:bg-secondary/10 hover:text-secondary'
                    }`}
                >
                  <span className={`flex-shrink-0 transition-transform duration-150 ${isGroupActive ? 'scale-110' : ''} ${!sidebarOpen ? 'lg:mx-auto' : ''}`}>{group.icon}</span>
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-left truncate">{group.label}</span>
                      <ChevronDown
                        size={13}
                        className={`flex-shrink-0 opacity-50 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                  {!sidebarOpen && (
                    <span className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-lg shadow-lg border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {group.label}
                    </span>
                  )}
                </button>

                {/* Sub-items */}
                {isExpanded && sidebarOpen && (
                  <div className="ml-3 mt-0.5 pl-3 border-l border-secondary/25 space-y-0.5">
                    {group.items.map(item => {
                      const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                      return (
                        <button
                          key={item.path}
                          onClick={() => { navigate(item.path); setMobileOpen(false); setSidebarOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 text-xs font-medium relative
                            ${active
                              ? 'text-white shadow-sm'
                              : 'text-foreground/60 hover:bg-secondary/10 hover:text-secondary'
                            }`}
                          style={active ? { background: 'hsl(var(--secondary))' } : undefined}
                        >
                          <span className="flex-shrink-0 opacity-70">{item.icon}</span>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {active && <ChevronRight size={11} className="flex-shrink-0 opacity-50" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <div className="relative z-10 flex-shrink-0 p-3">
          <div className="h-px bg-border mb-3" />
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all group relative ${!sidebarOpen ? 'lg:justify-center' : ''}`}
          >
            <LogOut size={15} className="flex-shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
            {!sidebarOpen && (
              <span className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-lg shadow-lg border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Sign Out
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">
        {/* Top bar */}
        <header
          className="flex-shrink-0 h-14 flex items-center px-4 sm:px-6 gap-3 shadow-sm border-b border-border bg-card"
        >
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </Button>

          {/* Page title */}
          {effectiveTitle && (
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="text-foreground font-semibold text-sm truncate">{effectiveTitle}</span>
            </div>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-sm">
            <span className="hidden sm:block text-muted-foreground truncate max-w-[160px] text-xs">{user.name}</span>
            <Badge variant="outline" className="text-xs border-secondary/30 text-secondary bg-secondary/10 flex-shrink-0 font-medium">
              {roleLabels[user.role]}
            </Badge>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 animate-fade-in">
          <div className="max-w-[1320px] mx-auto space-y-4 sm:space-y-5">
            {/* Module Banner — inside scroll so it flows with content */}
            {(() => {
              const path = location.pathname;
              const isExcluded = noBannerPaths.some(p => path === p || path.startsWith(p + '/') || path.includes('/dashboard'));
              const banner = bannerMap[path];
              if (isExcluded || !banner) return null;
              return (
                <div className="rounded-xl border border-border bg-card px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary [&>svg]:w-5 [&>svg]:h-5">{banner.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold text-foreground leading-tight tracking-tight">{effectiveTitle}</h1>
                    <p className="text-muted-foreground text-sm mt-0.5 leading-snug">{banner.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {banner.pills.map(p => (
                        <span key={p} className="inline-flex items-center text-xs bg-muted border border-border text-muted-foreground rounded-full px-2.5 py-0.5 font-medium">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
