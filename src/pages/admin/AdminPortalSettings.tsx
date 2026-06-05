import { useState, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { GraduationCap, CheckCircle, Settings, Eye, ImageIcon, Upload, X, FileText, Layers } from 'lucide-react';

export default function AdminPortalSettings() {
  const { state, updatePortalSettings } = useApp();
  const ps = state.portalSettings;

  const [form, setForm] = useState({
    portalName: ps.portalName,
    portalTagline: ps.portalTagline,
    institutionName: ps.institutionName,
    logoUrl: ps.logoUrl ?? '',
  });
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png') {
      setLogoError('Only PNG files are accepted. Please upload a .png file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('File too large. Maximum size is 2 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setLogoError('');
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setForm(prev => ({ ...prev, logoUrl: dataUrl }));
      setSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setForm(prev => ({ ...prev, logoUrl: '' }));
    setLogoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSaved(false);
  };

  const handleSave = () => {
    updatePortalSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const hasChanges =
    form.portalName !== ps.portalName ||
    form.portalTagline !== ps.portalTagline ||
    form.institutionName !== ps.institutionName ||
    (form.logoUrl ?? '') !== (ps.logoUrl ?? '');

  return (
    <PortalLayout title="Portal Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header card */}
        <div className="rounded-md border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-5 flex items-center gap-3">
          <Settings size={24} className="text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Portal Display Settings</p>
            <p className="text-sm text-muted-foreground">
              Customize the name, logo, and branding displayed across the portal.
              Changes take effect immediately for all users.
            </p>
          </div>
        </div>

        {/* Edit form */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <Settings size={14} /> Display Information
          </div>
          <div className="p-4 bg-background">
            <p className="text-xs text-muted-foreground mb-5">These values are shown in the portal header, login page, and sidebar.</p>
            <div className="space-y-5">

              {/* Logo Upload */}
              <div className="space-y-1.5">
                <Label htmlFor="logoUpload" className="flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-muted-foreground" /> Institution Logo (PNG)
                </Label>

                {form.logoUrl ? (
                  /* Logo set — show preview + replace/remove */
                  <div className="flex items-center gap-3 p-3 border border-border rounded-md bg-muted/20">
                    <img
                      src={form.logoUrl}
                      alt="Logo preview"
                      className="w-14 h-14 rounded-full object-cover border border-border shadow-sm flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Logo uploaded</p>
                      <p className="text-xs text-muted-foreground">PNG file stored as image data</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={11} /> Replace
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                        onClick={handleRemoveLogo}
                      >
                        <X size={11} /> Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* No logo — show upload drop zone */
                  <div
                    className="border-2 border-dashed border-border rounded-md p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <GraduationCap size={22} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Click to upload a <strong>PNG</strong> logo file
                    </p>
                    <p className="text-xs text-muted-foreground">Max 2 MB · PNG only</p>
                    <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      <Upload size={13} /> Choose PNG File
                    </Button>
                  </div>
                )}

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  id="logoUpload"
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={handleLogoFile}
                />

                {logoError && (
                  <p className="text-xs text-destructive font-medium">{logoError}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="portalName">Portal Name</Label>
                <Input
                  id="portalName"
                  placeholder="e.g. University AIS"
                  value={form.portalName}
                  onChange={e => handleChange('portalName', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shown in the header and login page (e.g. "DLSU AIS", "UST AIS")
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="portalTagline">Portal Tagline / Subtitle</Label>
                <Input
                  id="portalTagline"
                  placeholder="e.g. Academic Information System"
                  value={form.portalTagline}
                  onChange={e => handleChange('portalTagline', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Displayed below the portal name (e.g. "Enrollment &amp; Records System")
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="institutionName">Institution Name</Label>
                <Input
                  id="institutionName"
                  placeholder="e.g. University"
                  value={form.institutionName}
                  onChange={e => handleChange('institutionName', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Short institution name used in the login footer and landing page
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="bg-primary hover:bg-primary/90"
                >
                  Save Changes
                </Button>
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm text-secondary font-medium">
                    <CheckCircle size={14} />
                    Saved successfully
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <FileText size={14} /> Student Enrollment Features
          </div>
          <div className="p-4 bg-background space-y-4">
            <p className="text-xs text-muted-foreground">Control which features are visible to students after they finalize their enrollment.</p>
            <div className="flex items-center justify-between rounded-md border border-border p-4">
              <div className="flex items-start gap-3">
                <FileText size={16} className="text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Enrollment Form PDF Download</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When enabled, a <strong>"Download Enrollment Form"</strong> button appears on the finalized enrollment banner,
                    allowing students to generate and print their official Certificate of Enrollment.
                  </p>
                </div>
              </div>
              <Switch
                checked={!!ps.showEnrollmentFormPdf}
                onCheckedChange={v => updatePortalSettings({ showEnrollmentFormPdf: v })}
                className="ml-4 flex-shrink-0"
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <Layers size={14} /> Specialization Planner Deadlines
          </div>
          <div className="p-4 bg-background space-y-4">
            <p className="text-xs text-muted-foreground">
              Control the deadlines for students to request specialization changes and for OCS to process those requests.
              Leave blank to impose no deadline (always open).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="specChangeDeadline" className="flex items-center gap-1.5">
                  Student Change Deadline
                </Label>
                <Input
                  id="specChangeDeadline"
                  type="datetime-local"
                  value={ps.specializationChangeDeadline ? ps.specializationChangeDeadline.slice(0, 16) : ''}
                  onChange={e => updatePortalSettings({ specializationChangeDeadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground">Last date students can request a change of their approved specialization plan.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="specApprovalDeadline" className="flex items-center gap-1.5">
                  OCS Approval Deadline
                </Label>
                <Input
                  id="specApprovalDeadline"
                  type="datetime-local"
                  value={ps.specializationApprovalDeadline ? ps.specializationApprovalDeadline.slice(0, 16) : ''}
                  onChange={e => updatePortalSettings({ specializationApprovalDeadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground">Last date OCS can approve or deny specialization change requests.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="portal-panel">
          <div className="portal-panel-header">
            <Eye size={14} /> Login Page Preview
          </div>
          <div className="p-4 bg-background">
            <p className="text-xs text-muted-foreground mb-4">How the login page will look with your current settings.</p>

            {/* Mini login panel preview */}
            <div className="rounded-lg overflow-hidden border border-border shadow-md flex h-40 max-w-sm mx-auto">
              {/* Left panel preview */}
              <div
                className="w-2/5 flex flex-col items-center justify-center gap-2 px-3"
                style={{ background: 'var(--gradient-hero)' }}
              >
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Logo"
                    className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center">
                    <GraduationCap size={18} className="text-white/90" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-white text-[10px] font-bold leading-tight truncate max-w-[90px]">{form.portalName || 'Portal Name'}</p>
                  <p className="text-white/70 text-[8px] leading-tight truncate max-w-[90px]">{form.portalTagline || 'Tagline'}</p>
                </div>
              </div>
              {/* Right panel preview */}
              <div className="flex-1 bg-white flex flex-col items-center justify-center px-4 gap-1.5">
                <p className="text-base font-bold text-foreground">Welcome</p>
                <p className="text-[9px] text-muted-foreground text-center">Sign in with your account to continue</p>
                <div className="w-full mt-1 space-y-1">
                  <div className="h-5 rounded border border-border bg-muted/40 w-full" />
                  <div className="h-5 rounded border border-border bg-muted/40 w-full" />
                </div>
                <div className="w-full mt-1 h-5 rounded bg-primary" />
              </div>
            </div>

            {/* Sidebar preview */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Sidebar Logo
              </p>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg w-fit"
                style={{ background: 'var(--gradient-sidebar)' }}
              >
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <GraduationCap size={16} className="text-sidebar-primary-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sidebar-foreground font-bold text-sm leading-tight">
                    {form.portalName || 'Portal Name'}
                  </p>
                  <p className="text-sidebar-foreground/60 text-xs">
                    {form.portalTagline || 'Portal Tagline'}
                  </p>
                </div>
              </div>
            </div>

            {hasChanges && (
              <div className="flex items-center gap-2 pt-3 mt-2 border-t border-border/50">
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600 bg-yellow-50">
                  Unsaved changes
                </Badge>
                <span className="text-xs text-muted-foreground">Click "Save Changes" to apply.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
