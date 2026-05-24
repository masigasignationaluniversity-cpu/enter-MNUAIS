import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  LayoutDashboard, BookOpen, Users, Settings, LogOut,
  Menu, X, GraduationCap, ClipboardList, FileText,
  CalendarDays, Award, Star, BookMarked, BarChart3,
  UserCheck, ChevronRight, Bell
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
    { label: 'Term Control', path: '/admin/terms', icon: <CalendarDays size={16} /> },
    { label: 'User Management', path: '/admin/users', icon: <Users size={16} /> },
  ],
  ocs: [
    { label: 'Dashboard', path: '/ocs/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'Courses', path: '/ocs/courses', icon: <BookOpen size={16} /> },
    { label: 'Sections', path: '/ocs/sections', icon: <ClipboardList size={16} /> },
    { label: 'OCS Consents', path: '/ocs/consents', icon: <UserCheck size={16} /> },
  ],
  faculty: [
    { label: 'Dashboard', path: '/faculty/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'My Classes', path: '/faculty/classes', icon: <BookMarked size={16} /> },
    { label: 'Grade Encoding', path: '/faculty/grades', icon: <Award size={16} /> },
    { label: 'Student Evaluations', path: '/faculty/evaluations', icon: <Star size={16} /> },
  ],
  student: [
    { label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'Enlistment', path: '/student/enlistment', icon: <BookOpen size={16} /> },
    { label: 'My Consents', path: '/student/consent', icon: <FileText size={16} /> },
    { label: 'My Grades', path: '/student/grades', icon: <Award size={16} /> },
    { label: 'Evaluation', path: '/student/evaluation', icon: <Star size={16} /> },
    { label: 'My Profile', path: '/student/profile', icon: <BarChart3 size={16} /> },
  ],
};

const roleLabels: Record<Role, string> = {
  admin: 'Administrator',
  ocs: 'OCS Staff',
  faculty: 'Faculty',
  student: 'Student',
};

const roleBadgeColors: Record<Role, string> = {
  admin: 'bg-maroon-600 text-primary-foreground',
  ocs: 'bg-secondary text-secondary-foreground',
  faculty: 'bg-maroon-700 text-primary-foreground',
  student: 'bg-green-600 text-primary-foreground',
};

interface PortalLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function PortalLayout({ children, title }: PortalLayoutProps) {
  const { state, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const user = state.currentUser;

  if (!user) return null;

  const navItems = navByRole[user.role];
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate(`/${user.role}`);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-60' : 'w-16'}`}
        style={{ background: 'var(--gradient-sidebar)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <GraduationCap size={18} className="text-sidebar-primary-foreground" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sidebar-foreground font-bold text-sm leading-tight truncate">University AIS</p>
              <p className="text-sidebar-foreground/60 text-xs truncate">Academic Info System</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
            onClick={() => setSidebarOpen(v => !v)}
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
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all text-sm font-medium group
                  ${active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 bg-card border-b border-border flex items-center px-6 gap-4">
          <div className="flex-1">
            {title && <h1 className="text-base font-semibold text-foreground">{title}</h1>}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Bell size={16} />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:block">{user.name}</span>
            <Badge variant="outline" className="text-xs border-primary text-primary">{roleLabels[user.role]}</Badge>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
