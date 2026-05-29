import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/dialog';
import {
  LayoutDashboard, BookOpen, Users, LogOut,
  Menu, X, GraduationCap, ClipboardList, FileText,
  CalendarDays, Award, Star, BookMarked, BarChart3,
  UserCheck, ChevronRight, Bell, Unlock, FileBarChart, Settings, Building2, DoorOpen, ShieldAlert, FilePen, RefreshCw, Megaphone, Timer,
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
    { label: 'Portal Settings', path: '/admin/portal-settings', icon: <Settings size={16} /> },
  ],
  ocs: [
    { label: 'Dashboard', path: '/ocs/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'Course Overview', path: '/ocs/course-overview', icon: <BookOpen size={16} /> },
    { label: 'OCS Consents', path: '/ocs/consents', icon: <UserCheck size={16} /> },
    { label: 'Students', path: '/ocs/students', icon: <Users size={16} /> },
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
    { label: 'SET', path: '/student/evaluation', icon: <Star size={16} /> },
    { label: 'My Profile', path: '/student/profile', icon: <BarChart3 size={16} /> },
  ],
  department_head: [
    { label: 'Dashboard', path: '/depthead/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'Dept Consent', path: '/depthead/consents', icon: <UserCheck size={16} /> },
    { label: 'Sections', path: '/depthead/sections', icon: <ClipboardList size={16} /> },
    { label: 'Courses', path: '/depthead/courses', icon: <BookOpen size={16} /> },
  ],
};

const roleLabels: Record<Role, string> = {
  admin: 'Administrator',
  ocs: 'OCS Staff',
  faculty: 'Faculty',
  student: 'Student',
  department_head: 'Department Head',
};

const roleBadgeColors: Record<Role, string> = {
  admin: 'bg-maroon-600 text-primary-foreground',
  ocs: 'bg-secondary text-secondary-foreground',
  faculty: 'bg-maroon-700 text-primary-foreground',
  student: 'bg-green-600 text-primary-foreground',
  department_head: 'bg-amber-600 text-white',
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

  // ── Idle auto-logout ────────────────────────────────────────────────────────
  const IDLE_MS   = 30 * 60 * 1000; // 30 minutes before logout
  const WARN_MS   = 2  * 60 * 1000; // show warning 2 minutes before
  const lastActivityRef = useRef(Date.now());
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(120);

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowIdleWarning(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, resetIdleTimer));
  }, [user, resetIdleTimer]);

  useEffect(() => {
    if (!user) return;
    const tick = setInterval(async () => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_MS) {
        clearInterval(tick);
        localStorage.setItem('ais_logout_reason', 'idle_timeout');
        await logout();
        navigate('/login', { replace: true });
      } else if (idle >= IDLE_MS - WARN_MS) {
        const secs = Math.ceil((IDLE_MS - idle) / 1000);
        setIdleCountdown(secs);
        setShowIdleWarning(true);
      }
    }, 1000);
    return () => clearInterval(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  // ────────────────────────────────────────────────────────────────────────────

  // Redirect to unified login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  if (!user) return null;

  const navItems = navByRole[user.role] ?? [];
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Auto-derive title from active nav item if not explicitly provided
  const activeNavItem = navItems.find(item =>
    location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  );
  const effectiveTitle = title ?? activeNavItem?.label;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-full w-full overflow-hidden portal-bg relative">
      {/* Ambient orbs — decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="portal-orb portal-orb-1" />
        <div className="portal-orb portal-orb-2" />
      </div>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300
          lg:relative lg:inset-auto lg:z-10 lg:flex-shrink-0
          w-60 ${sidebarOpen ? 'lg:w-60' : 'lg:w-16'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        style={{ background: 'var(--gradient-sidebar)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center overflow-hidden">
            {ps.logoUrl ? (
              <img src={ps.logoUrl} alt="Logo" className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <GraduationCap size={18} className="text-sidebar-primary-foreground" />
            )}
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sidebar-foreground font-bold text-sm leading-tight truncate">{ps.portalName}</p>
              <p className="text-sidebar-foreground/60 text-xs truncate">{ps.portalTagline}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileOpen(false);
              } else {
                setSidebarOpen(v => !v);
              }
            }}
          >
            {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
          </Button>
        </div>

        {/* User info */}
        {sidebarOpen && (
          <div className="px-4 py-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-sidebar-primary flex-shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="text-sidebar-foreground text-sm font-semibold truncate">{user.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColors[user.role]}`}>
                  {roleLabels[user.role]}
                </span>
              </div>
            </div>
          </div>
        )}
        {!sidebarOpen && (
          <div className="flex justify-center py-3 border-b border-sidebar-border">
            <Avatar className="h-8 w-8 border-2 border-sidebar-primary">
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <p className={`text-sidebar-foreground/40 text-xs font-semibold uppercase tracking-wider mb-2 ${sidebarOpen ? 'px-2' : 'text-center'}`}>
            {sidebarOpen ? 'Navigation' : '•'}
          </p>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all text-sm font-medium group
                  ${active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md ring-1 ring-sidebar-primary/50'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  } ${!sidebarOpen ? 'justify-center' : ''}`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {active && <ChevronRight size={12} />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:bg-red-900/30 hover:text-red-300 transition-all ${!sidebarOpen ? 'justify-center' : ''}`}
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <LogOut size={16} />
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top bar */}
        <header
          className="flex-shrink-0 h-14 flex items-center px-6 gap-4 shadow-md"
          style={{ background: 'var(--gradient-header)' }}
        >
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </Button>
          <div className="flex-1">
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10">
            <Bell size={16} />
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden sm:block text-white/80">{user.name}</span>
            <Badge variant="outline" className="text-xs border-white/30 text-white bg-white/10">{roleLabels[user.role]}</Badge>
          </div>
        </header>

        {/* Module title banner */}
        {effectiveTitle && (
          <div className="module-title-banner">{effectiveTitle}</div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Idle timeout warning dialog */}
      <Dialog open={showIdleWarning} onOpenChange={() => resetIdleTimer()}>
        <DialogContent className="max-w-sm text-center" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Timer size={24} className="text-amber-600" />
              </div>
            </div>
            <DialogTitle className="text-center">Session Expiring Soon</DialogTitle>
            <DialogDescription className="text-center">
              You have been inactive. Your session will automatically end in{' '}
              <span className="font-bold text-destructive">
                {Math.floor(idleCountdown / 60)}:{String(idleCountdown % 60).padStart(2, '0')}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={resetIdleTimer}>
              Stay Logged In
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={async () => {
              setShowIdleWarning(false);
              localStorage.setItem('ais_logout_reason', 'idle_timeout');
              await logout();
              navigate('/login', { replace: true });
            }}>
              Logout Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
