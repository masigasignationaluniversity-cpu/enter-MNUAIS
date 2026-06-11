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
  UserCheck, ChevronRight, Unlock, FileBarChart, Settings, Building2, DoorOpen, ShieldAlert, FilePen, RefreshCw, Megaphone, PenSquare, ChevronLeft, KeyRound, Send, Layers,
} from 'lucide-react';
import type { Role } from '../../lib/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navByRole: Record<Role, NavItem[]> = {
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'Dashboard Content', path: '/admin/dashboard-content', icon: <Megaphone size={16} /> },
    { label: 'Term Control', path: '/admin/terms', icon: <CalendarDays size={16} /> },
    { label: 'User Management', path: '/admin/users', icon: <Users size={16} /> },
    { label: 'Report Cards', path: '/admin/reportcard', icon: <FileBarChart size={16} /> },
    { label: 'Academic Units', path: '/admin/academic-units', icon: <Building2 size={16} /> },
    { label: 'Rooms', path: '/admin/rooms', icon: <DoorOpen size={16} /> },
    { label: 'Password Tickets', path: '/admin/password-tickets', icon: <KeyRound size={16} /> },
    { label: 'Graduation', path: '/admin/graduation-settings', icon: <GraduationCap size={16} /> },
    { label: 'Portal Settings', path: '/admin/portal-settings', icon: <Settings size={16} /> },
  ],
  ocs: [
    { label: 'Dashboard', path: '/ocs/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'Course Overview', path: '/ocs/course-overview', icon: <BookOpen size={16} /> },
    { label: 'OCS Consents', path: '/ocs/consents', icon: <UserCheck size={16} /> },
    { label: 'Students', path: '/ocs/students', icon: <Users size={16} /> },
    { label: 'Grade & Enrollment', path: '/ocs/grade-management', icon: <PenSquare size={16} /> },
    { label: 'Plan of Study', path: '/ocs/plan-of-study', icon: <GraduationCap size={16} /> },
    { label: 'Specialization', path: '/ocs/specialization', icon: <Layers size={16} /> },
    { label: 'GE Elective Requests', path: '/ocs/ge-elective', icon: <BookMarked size={16} /> },
    { label: 'Underload Applications', path: '/ocs/underload', icon: <FileText size={16} /> },
    { label: 'Graduation Applications', path: '/ocs/graduation-applications', icon: <Send size={16} /> },
    { label: 'Reconsideration', path: '/ocs/reconsideration', icon: <ShieldAlert size={16} /> },
    { label: 'Change & Drop', path: '/ocs/change-drop', icon: <RefreshCw size={16} /> },
  ],
  faculty: [
    { label: 'Dashboard', path: '/faculty/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'My Classes', path: '/faculty/classes', icon: <BookMarked size={16} /> },
    { label: 'My Timetable', path: '/faculty/timetable', icon: <CalendarDays size={16} /> },
    { label: 'Grade Encoding', path: '/faculty/grades', icon: <Award size={16} /> },
    { label: 'Prerogatives', path: '/faculty/prerogatives', icon: <Unlock size={16} /> },
    { label: 'Consents', path: '/faculty/consents', icon: <ClipboardList size={16} /> },
    { label: 'Removal/Completion', path: '/faculty/removal-grades', icon: <FilePen size={16} /> },
    { label: 'Student Evaluations', path: '/faculty/evaluations', icon: <Star size={16} /> },
  ],
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'Enlistment', path: '/student/enlistment', icon: <BookOpen size={16} /> },
    { label: 'Prerogatives', path: '/student/prerogatives', icon: <Unlock size={16} /> },
    { label: 'My Consents', path: '/student/consent', icon: <FileText size={16} /> },
    { label: 'My Grades', path: '/student/grades', icon: <Award size={16} /> },
    { label: 'Plan of Study', path: '/student/plan-of-study', icon: <GraduationCap size={16} /> },
    { label: 'Specialization', path: '/student/specialization', icon: <Layers size={16} /> },
    { label: 'GE Electives', path: '/student/ge-elective', icon: <BookMarked size={16} /> },
    { label: 'SET', path: '/student/evaluation', icon: <Star size={16} /> },
    { label: 'My Profile', path: '/student/profile', icon: <BarChart3 size={16} /> },
  ],
  department_head: [
    { label: 'Dashboard', path: '/depthead/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'Department Consent', path: '/depthead/consents', icon: <UserCheck size={16} /> },
    { label: 'Sections', path: '/depthead/sections', icon: <ClipboardList size={16} /> },
    { label: 'Courses', path: '/depthead/courses', icon: <BookOpen size={16} /> },
  ],
};

type BannerDef = { icon: React.ReactNode; desc: string; pills: string[] };
const bannerMap: Record<string, BannerDef> = {
  // Student
  '/student/enlistment':   { icon: <BookOpen className="w-8 h-8 text-white"/>, desc: 'Browse available course sections and manage your enlistment for the current term.', pills: ['Browse course offerings','Bookmark sections','Track enlistment status'] },
  '/student/prerogatives': { icon: <Unlock className="w-8 h-8 text-white"/>, desc: 'Request special admission into full or restricted sections for this term.', pills: ['Submit prerog requests','Track approval status'] },
  '/student/consent':      { icon: <FileText className="w-8 h-8 text-white"/>, desc: 'Respond to enrollment consent requests from faculty or OCS.', pills: ['View pending consents','Accept or decline requests'] },
  '/student/grades':       { icon: <Award className="w-8 h-8 text-white"/>, desc: 'View your official grades and academic performance across all terms.', pills: ['Term-by-term grades','Track GWA','View completion rate'] },
  '/student/evaluation':   { icon: <Star className="w-8 h-8 text-white"/>, desc: 'Evaluate faculty teaching performance for the current semester.', pills: ['Submit evaluations','Rate teaching quality','Anonymous responses'] },
  '/student/plan-of-study':{ icon: <GraduationCap className="w-8 h-8 text-white"/>, desc: 'Your academic roadmap — monitor passed, in-progress, and pending course requirements for graduation.', pills: ['Track required courses','View grade history','Apply for graduation'] },
  '/student/specialization': { icon: <Layers className="w-8 h-8 text-white"/>, desc: 'Select and submit your specialization course plan for OCS approval. Your approved plan unlocks enrollment in Specialized courses.', pills: ['Choose specialization','Submit for approval','Track request status'] },
  '/student/ge-elective':    { icon: <BookMarked className="w-8 h-8 text-white"/>, desc: 'Select your Elective GE courses and submit a plan for OCS approval. An approved plan is required to enlist in Elective GE courses.', pills: ['Browse GE courses','Submit plan','Track approval'] },
  // Faculty
  '/faculty/classes':       { icon: <BookMarked className="w-8 h-8 text-white"/>, desc: 'View your class rosters and manage enrolled students for each section.', pills: ['View class lists','Export student CSV','Check enlistment counts'] },
  '/faculty/timetable':     { icon: <CalendarDays className="w-8 h-8 text-white"/>, desc: 'View your weekly class schedule and room assignments for the current term.', pills: ['Weekly schedule view','Room info','Lab schedules'] },
  '/faculty/grades':        { icon: <Award className="w-8 h-8 text-white"/>, desc: 'Encode and submit official grades for your assigned course sections.', pills: ['Enter grades','Submit to OCS','Export grade sheets'] },
  '/faculty/prerogatives':  { icon: <Unlock className="w-8 h-8 text-white"/>, desc: 'Review and act on student prerogative requests for your sections.', pills: ['Approve/deny requests','Override slot limits'] },
  '/faculty/consents':      { icon: <ClipboardList className="w-8 h-8 text-white"/>, desc: 'Manage student enrollment consent requests for your courses.', pills: ['View pending consents','Approve/deny enrollments'] },
  '/faculty/removal-grades':{ icon: <FilePen className="w-8 h-8 text-white"/>, desc: 'Submit grade changes for incomplete, conditional, and removal grade assessments.', pills: ['Grade removal','Completion submissions','INC resolution'] },
  '/faculty/evaluations':   { icon: <Star className="w-8 h-8 text-white"/>, desc: 'View anonymized student evaluations submitted for your courses this term.', pills: ['View ratings','Performance insights','Anonymous feedback'] },
  // OCS
  '/ocs/course-overview':   { icon: <BookOpen className="w-8 h-8 text-white"/>, desc: 'View and monitor all active course sections across the institution.', pills: ['Sections overview','Enrollment data','Faculty assignments'] },
  '/ocs/consents':          { icon: <UserCheck className="w-8 h-8 text-white"/>, desc: 'Review and process student enrollment consent requests from all colleges.', pills: ['Process consents','Approve/deny enrollments'] },
  '/ocs/students':          { icon: <Users className="w-8 h-8 text-white"/>, desc: 'Access student academic records, grades, and generate official transcripts.', pills: ['Search students','Download TOR','Export grades'] },
  '/ocs/grade-management':  { icon: <PenSquare className="w-8 h-8 text-white"/>, desc: 'Manage and override student grades and enrollment records as needed.', pills: ['Override grades','Enroll/drop students','Submit corrections'] },
  '/ocs/plan-of-study':     { icon: <GraduationCap className="w-8 h-8 text-white"/>, desc: 'Configure required courses and review student progress towards degree completion.', pills: ['Set required courses','View student progress','Manage degree plans'] },
  '/ocs/specialization':    { icon: <Layers className="w-8 h-8 text-white"/>, desc: 'Review and process student specialization plan requests. Approve or deny submitted course selections.', pills: ['Review requests','Approve/deny plans','Track student specs'] },
  '/ocs/ge-elective':       { icon: <BookMarked className="w-8 h-8 text-white"/>, desc: 'Review and process student GE Elective plan requests. Approve or deny submitted Elective GE course selections.', pills: ['Review requests','Approve/deny plans','Track GE plans'] },
  '/ocs/underload':         { icon: <FileText className="w-8 h-8 text-white"/>, desc: 'Review and process student underload applications for the active term. Approve or deny students with fewer than 15 enlisted units.', pills: ['Review applications','Approve/deny','Track status'] },
  '/ocs/graduation-applications': { icon: <Send className="w-8 h-8 text-white"/>, desc: 'Review and process student applications for graduation clearance.', pills: ['Approve/deny applications','View course records','Track status'] },
  '/ocs/reconsideration':   { icon: <ShieldAlert className="w-8 h-8 text-white"/>, desc: 'Review and decide on student requests to reconsider their official grades.', pills: ['Process requests','Submit decisions','Notify students'] },
  '/ocs/change-drop':       { icon: <RefreshCw className="w-8 h-8 text-white"/>, desc: 'Manage student requests to change or drop currently enrolled courses.', pills: ['Approve/deny changes','Track request history'] },
  '/ocs/courses':           { icon: <BookOpen className="w-8 h-8 text-white"/>, desc: 'Manage course catalog entries, units, prerequisites, and course types.', pills: ['Add/edit courses','Set prerequisites','Configure co-reqs'] },
  '/ocs/sections':          { icon: <ClipboardList className="w-8 h-8 text-white"/>, desc: 'Create and manage course sections, schedules, and faculty assignments.', pills: ['Create sections','Assign faculty','Set schedules'] },
  '/ocs/prerogatives':      { icon: <Unlock className="w-8 h-8 text-white"/>, desc: 'Review prerogative requests submitted by students for full or restricted sections.', pills: ['View all requests','Approve/deny','Track status'] },
  // Admin
  '/admin/terms':             { icon: <CalendarDays className="w-8 h-8 text-white"/>, desc: 'Create and manage academic terms, enlistment periods, and scheduling windows.', pills: ['Create terms','Set enlistment windows','Control active term'] },
  '/admin/users':             { icon: <Users className="w-8 h-8 text-white"/>, desc: 'Manage all student, faculty, OCS, and administrator user accounts.', pills: ['Create/edit users','Assign roles','Reset passwords'] },
  '/admin/reportcard':        { icon: <FileBarChart className="w-8 h-8 text-white"/>, desc: 'Generate and view student report cards and academic summaries by term.', pills: ['Generate reports','Export PDF','Filter by college'] },
  '/admin/academic-units':    { icon: <Building2 className="w-8 h-8 text-white"/>, desc: 'Manage colleges, departments, and degree programs across the institution.', pills: ['Manage colleges','Set degree programs','Configure departments'] },
  '/admin/rooms':             { icon: <DoorOpen className="w-8 h-8 text-white"/>, desc: 'Manage classrooms, laboratories, and room assignments for course sections.', pills: ['Add/edit rooms','View availability','Assign to sections'] },
  '/admin/password-tickets':  { icon: <KeyRound className="w-8 h-8 text-white"/>, desc: 'Review and resolve student password reset requests and account issues.', pills: ['View tickets','Reset passwords','Track resolutions'] },
  '/admin/graduation-settings':{ icon: <GraduationCap className="w-8 h-8 text-white"/>, desc: 'Configure graduation eligibility requirements, honors thresholds, and degree rules.', pills: ['Set requirements','Configure honors','Manage eligibility'] },
  '/admin/portal-settings':   { icon: <Settings className="w-8 h-8 text-white"/>, desc: 'Customize portal appearance, institution name, logo, and global settings.', pills: ['Edit portal name','Upload logo','Configure tagline'] },
  '/admin/dashboard-content': { icon: <Megaphone className="w-8 h-8 text-white"/>, desc: 'Manage announcements and content displayed on all portal dashboards.', pills: ['Post announcements','Manage visibility'] },
  // DeptHead
  '/depthead/consents':  { icon: <UserCheck className="w-8 h-8 text-white"/>, desc: 'Review and approve student enrollment consent requests for your department.', pills: ['Process consents','Track approvals'] },
  '/depthead/sections':  { icon: <ClipboardList className="w-8 h-8 text-white"/>, desc: 'Manage course sections and faculty assignments within your department.', pills: ['View sections','Assign faculty','Set schedules'] },
  '/depthead/courses':   { icon: <BookOpen className="w-8 h-8 text-white"/>, desc: 'Manage the course curriculum and offerings for your department.', pills: ['Add/edit courses','Set prerequisites','Manage curriculum'] },
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
  admin: 'bg-primary/20 text-primary-foreground border border-primary-foreground/20',
  ocs: 'bg-blue-500/20 text-blue-100 border border-blue-400/30',
  faculty: 'bg-violet-500/20 text-violet-100 border border-violet-400/30',
  student: 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30',
  department_head: 'bg-amber-500/20 text-amber-100 border border-amber-400/30',
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = state.currentUser;
  const ps = state.portalSettings;

  // ────────────────────────────────────────────────────────────────────────────
  // ProtectedRoute in router.tsx already ensures user is logged in via
  // localStorage. This useEffect is a safety net for runtime logout events
  // (e.g. session expired via the 60s heartbeat clearing currentUser in context).
  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

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

  const navItems = (() => {
    const items = navByRole[user.role] ?? [];
    if (user.role === 'student') {
      const prog = state.degreePrograms?.find(p => p.name === user.program || p.id === user.program);
      if (prog?.degreeType === 'associate_certificate') {
        return items.filter(item => item.path !== '/student/specialization' && item.path !== '/student/ge-elective');
      }
    }
    return items;
  })();
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
        style={{ background: 'var(--gradient-sidebar)' }}
      >
        {/* Dot-grid overlay */}
        <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 100% / 0.04) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
        {/* Bottom ambient glow */}
        <div className="absolute -bottom-12 -left-10 w-48 h-48 rounded-full blur-3xl pointer-events-none z-0" style={{ background: 'hsl(158 48% 40% / 0.18)' }} />

        {/* ── Brand / Logo ─────────────────────────────────────────── */}
        <div className={`relative z-10 flex items-center gap-3 px-4 py-4 flex-shrink-0 ${!sidebarOpen ? 'lg:justify-center lg:px-2' : ''}`}>
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg border border-white/15"
               style={{ background: 'var(--gradient-header)' }}>
            {ps.logoUrl ? (
              <img src={ps.logoUrl} alt="Logo" className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <GraduationCap size={20} className="text-white" />
            )}
          </div>
          {sidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight truncate">{ps.portalName}</p>
              <p className="text-white/45 text-xs truncate leading-snug">{ps.portalTagline}</p>
            </div>
          )}
          {/* Separator */}
          <div className="absolute bottom-0 left-4 right-4 h-px bg-white/8" />
        </div>

        {/* ── User info ────────────────────────────────────────────── */}
        <div className={`relative z-10 flex-shrink-0 ${sidebarOpen ? 'px-4 py-3.5' : 'lg:py-3 py-3 px-4 lg:px-2'}`}>
          <div className={`flex items-center gap-3 ${!sidebarOpen ? 'lg:justify-center' : ''}`}>
            <div className="relative flex-shrink-0">
              <Avatar className="h-10 w-10 border-2 border-white/20 shadow-md">
                <AvatarFallback className="text-xs font-bold text-white" style={{ background: 'var(--gradient-header)' }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-sidebar" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden flex-1">
                <p className="text-white text-sm font-semibold truncate leading-tight">{user.name}</p>
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-0.5 tracking-wide ${roleBadgeColors[user.role]}`}>
                  {roleLabels[user.role]}
                </span>
              </div>
            )}
          </div>
          {/* Separator */}
          <div className="absolute bottom-0 left-4 right-4 h-px bg-white/8" />
        </div>

        {/* ── Hamburger / Collapse toggle ───────────────────────────── */}
        <div className={`relative z-10 flex-shrink-0 px-3 py-2 ${!sidebarOpen ? 'lg:flex lg:justify-center' : ''}`}>
          <button
            onClick={toggleSidebar}
            className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/8 transition-all text-xs font-medium ${!sidebarOpen ? 'lg:w-auto lg:justify-center' : ''}`}
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
            <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest px-2.5 pt-1 pb-2 select-none">
              Menu
            </p>
          )}
          {navItems.map(item => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 text-sm font-medium relative group
                  ${sidebarOpen ? 'px-3 py-2.5' : 'lg:justify-center lg:px-0 lg:py-2.5 px-3 py-2.5'}
                  ${active
                    ? 'text-white shadow-md'
                    : 'text-white/55 hover:bg-white/8 hover:text-white/90'
                  }`}
                style={active ? { background: 'var(--gradient-header)' } : undefined}
              >
                <span className={`flex-shrink-0 transition-transform duration-150 ${active ? 'scale-110' : ''} ${!sidebarOpen ? 'lg:mx-auto' : ''}`}>{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {active && <ChevronRight size={12} className="flex-shrink-0 opacity-60" />}
                  </>
                )}
                {/* Tooltip for collapsed mode */}
                {!sidebarOpen && (
                  <span className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs font-medium rounded-lg shadow-lg border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <div className="relative z-10 flex-shrink-0 p-3">
          <div className="h-px bg-white/8 mb-3" />
          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Logout' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:bg-red-500/15 hover:text-red-300 transition-all group relative ${!sidebarOpen ? 'lg:justify-center' : ''}`}
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
          className="flex-shrink-0 h-14 flex items-center px-4 sm:px-6 gap-3 shadow-md border-b border-white/10"
          style={{ background: 'var(--gradient-header)' }}
        >
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </Button>

          {/* Page title */}
          {effectiveTitle && (
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="text-white/90 font-semibold text-sm truncate">{effectiveTitle}</span>
            </div>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-sm">
            <span className="hidden sm:block text-white/75 truncate max-w-[160px] text-xs">{user.name}</span>
            <Badge variant="outline" className="text-xs border-white/25 text-white/90 bg-white/10 flex-shrink-0 font-medium">
              {roleLabels[user.role]}
            </Badge>
          </div>
        </header>

        {/* Module Banner */}
        {(() => {
          const path = location.pathname;
          const isExcluded = noBannerPaths.some(p => path === p || path.startsWith(p + '/') || path.includes('/dashboard'));
          const banner = bannerMap[path];
          if (isExcluded || !banner) return null;
          return (
            <div className="flex-shrink-0 px-3 pt-3 sm:px-5 sm:pt-4 lg:px-6 lg:pt-5">
              <div className="max-w-[1320px] mx-auto">
                <div className="rounded-2xl overflow-hidden shadow-md relative" style={{ background: 'var(--gradient-hero)' }}>
                  {/* Decorative orbs */}
                  <div className="absolute -top-8 -right-8 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
                  <div className="absolute -bottom-12 right-24 w-36 h-36 rounded-full bg-white/4 pointer-events-none" />
                  {/* Dot grid */}
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, hsl(0 0% 100% / 0.07) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

                  <div className="relative z-10 px-5 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                      {banner.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-xl font-extrabold text-white leading-tight tracking-tight">{effectiveTitle}</h1>
                      <p className="text-white/65 text-sm mt-1 leading-snug">{banner.desc}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {banner.pills.map(p => (
                          <span key={p} className="inline-flex items-center text-xs bg-white/12 border border-white/15 text-white/90 rounded-full px-3 py-0.5 font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 animate-fade-in">
          <div className="max-w-[1320px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
