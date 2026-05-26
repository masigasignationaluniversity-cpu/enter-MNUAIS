import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { GraduationCap, CheckCircle, Settings, Eye } from 'lucide-react';

export default function AdminPortalSettings() {
  const { state, updatePortalSettings } = useApp();
  const ps = state.portalSettings;

  const [form, setForm] = useState({
    portalName: ps.portalName,
    portalTagline: ps.portalTagline,
    institutionName: ps.institutionName,
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
    form.institutionName !== ps.institutionName;

  return (
    <PortalLayout title="Portal Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header card */}
        <div className="rounded-md border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 p-5 flex items-center gap-3">
          <Settings size={24} className="text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Portal Display Settings</p>
            <p className="text-sm text-muted-foreground">
              Customize the name and branding displayed across the entire portal.
              Changes take effect immediately for all users.
            </p>
          </div>
        </div>

        {/* Edit form */}
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center gap-2">
            <Settings size={14} /> Display Information
          </div>
          <div className="p-4 bg-background">
            <p className="text-xs text-muted-foreground mb-5">These values are shown in the portal header, login page, and sidebar.</p>
            <div className="space-y-5">
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
                Displayed below the portal name (e.g. "Enrollment & Records System")
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
                Short institution name used in the landing page heading and footer
                (e.g. "De La Salle University", "University of Santo Tomas")
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
        <div className="rounded-md overflow-hidden border border-border">
          <div className="bg-primary text-primary-foreground px-4 py-2.5 font-bold text-sm flex items-center gap-2">
            <Eye size={14} /> Live Preview
          </div>
          <div className="p-4 bg-background">
            <p className="text-xs text-muted-foreground mb-4">How the portal header and landing page will look with your current settings.</p>
            <div className="space-y-4">
            {/* Header preview */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Portal Header
              </p>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg"
                style={{ background: 'var(--gradient-hero)' }}
              >
                <div className="w-9 h-9 rounded-lg bg-primary-foreground/20 border border-primary-foreground/30 flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={18} className="text-primary-foreground" />
                </div>
                <div>
                  <p className="text-primary-foreground font-bold text-sm leading-tight">
                    {form.portalName || 'Portal Name'}
                  </p>
                  <p className="text-primary-foreground/60 text-xs">
                    {form.portalTagline || 'Portal Tagline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Landing page hero preview */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Landing Page Heading
              </p>
              <div
                className="px-6 py-5 rounded-lg text-center"
                style={{ background: 'var(--gradient-hero)' }}
              >
                <h1 className="text-xl font-bold text-primary-foreground mb-1">
                  {form.institutionName || 'Institution'} {form.portalTagline || 'Portal Tagline'}
                </h1>
                <p className="text-primary-foreground/70 text-sm">
                  Select your portal to access your academic tools.
                </p>
              </div>
            </div>

            {/* Sidebar preview */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Sidebar Logo
              </p>
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg w-fit"
                style={{ background: 'var(--gradient-sidebar)' }}
              >
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={16} className="text-sidebar-primary-foreground" />
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

            {/* Footer preview */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Footer
              </p>
              <div className="px-4 py-2 rounded-lg bg-muted text-center">
                <p className="text-muted-foreground text-xs">
                  {form.institutionName || 'Institution'} {form.portalTagline || 'Portal Tagline'} &copy; {new Date().getFullYear()}
                </p>
              </div>
            </div>

            {/* Badge */}
            {(form.portalName !== ps.portalName || form.portalTagline !== ps.portalTagline || form.institutionName !== ps.institutionName) && (
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600 bg-yellow-50">
                  Unsaved changes
                </Badge>
                <span className="text-xs text-muted-foreground">Click "Save Changes" to apply.</span>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
