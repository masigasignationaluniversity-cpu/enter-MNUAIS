import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import PortalLayout from '../../components/shared/PortalLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Bold, Italic, Underline, List, ListOrdered, Heading2, Heading3,
  Link, Minus, CheckCircle, Eye, Code, Bell, User, LayoutDashboard,
  Table2, Highlighter
} from 'lucide-react';
import DashboardAnnouncements from '../../components/shared/DashboardAnnouncements';

// ─── Rich Text Editor ─────────────────────────────────────────────────────────

interface RichTextEditorProps {
  initialValue: string;
  onChange: (html: string) => void;
}

function RichTextEditor({ initialValue, onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [showSource, setShowSource] = useState(false);
  const [sourceValue, setSourceValue] = useState(initialValue);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && editorRef.current) {
      editorRef.current.innerHTML = initialValue;
      initialized.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exec = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value ?? undefined);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setSourceValue(html);
    }
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setSourceValue(html);
    }
  };

  const handleSourceChange = (val: string) => {
    setSourceValue(val);
    onChange(val);
    if (editorRef.current) {
      editorRef.current.innerHTML = val;
    }
  };

  const handleLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };

  const handleInsertTable = () => {
    const html = `<table style="border-collapse:collapse;width:100%;margin:8px 0"><tr><th style="border:1px solid #ccc;padding:6px 10px;background:#f3f4f6;text-align:left">Header 1</th><th style="border:1px solid #ccc;padding:6px 10px;background:#f3f4f6;text-align:left">Header 2</th><th style="border:1px solid #ccc;padding:6px 10px;background:#f3f4f6;text-align:left">Header 3</th></tr><tr><td style="border:1px solid #ccc;padding:6px 10px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px 10px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px 10px">&nbsp;</td></tr><tr><td style="border:1px solid #ccc;padding:6px 10px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px 10px">&nbsp;</td><td style="border:1px solid #ccc;padding:6px 10px">&nbsp;</td></tr></table><p><br></p>`;
    exec('insertHTML', html);
  };

  const handleFillColor = (color: string) => {
    editorRef.current?.focus();
    document.execCommand('backColor', false, color);
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
      setSourceValue(html);
    }
  };

  const toolbarBtn = (icon: React.ReactNode, cmd: () => void, title: string) => (
    <button
      type="button"
      onClick={cmd}
      title={title}
      className="p-1.5 rounded hover:bg-secondary/20 text-foreground transition-colors"
    >
      {icon}
    </button>
  );

  return (
    <div className="rounded-md overflow-hidden border border-secondary/40">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-secondary/10 border-b border-secondary/30">
        {toolbarBtn(<Bold size={14} />, () => exec('bold'), 'Bold')}
        {toolbarBtn(<Italic size={14} />, () => exec('italic'), 'Italic')}
        {toolbarBtn(<Underline size={14} />, () => exec('underline'), 'Underline')}
        <div className="w-px h-4 bg-border mx-1" />
        {toolbarBtn(<Heading2 size={14} />, () => exec('formatBlock', 'h2'), 'Heading 2')}
        {toolbarBtn(<Heading3 size={14} />, () => exec('formatBlock', 'h3'), 'Heading 3')}
        <div className="w-px h-4 bg-border mx-1" />
        {toolbarBtn(<List size={14} />, () => exec('insertUnorderedList'), 'Bullet List')}
        {toolbarBtn(<ListOrdered size={14} />, () => exec('insertOrderedList'), 'Numbered List')}
        <div className="w-px h-4 bg-border mx-1" />
        {toolbarBtn(<Link size={14} />, handleLink, 'Insert Link')}
        {toolbarBtn(<Minus size={14} />, () => exec('insertHorizontalRule'), 'Divider')}
        <div className="w-px h-4 bg-border mx-1" />
        {toolbarBtn(<Table2 size={14} />, handleInsertTable, 'Insert Table')}
        {/* Fill color button */}
        <div className="relative">
          <input
            ref={colorInputRef}
            type="color"
            defaultValue="#ffff99"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            onChange={e => handleFillColor(e.target.value)}
          />
          <button
            type="button"
            title="Fill / Highlight Color"
            onClick={() => colorInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-secondary/20 text-foreground transition-colors"
          >
            <Highlighter size={14} />
          </button>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowSource(s => !s)}
          title="Toggle Source"
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            showSource ? 'bg-secondary/30 text-secondary' : 'hover:bg-secondary/20 text-muted-foreground'
          }`}
        >
          <Code size={12} />
          <span>Source</span>
        </button>
      </div>

      {/* Editor / Source */}
      {showSource ? (
        <textarea
          value={sourceValue}
          onChange={e => handleSourceChange(e.target.value)}
          className="w-full min-h-56 p-3 font-mono text-xs bg-background text-foreground focus:outline-none resize-y"
          placeholder="<p>Enter HTML content here...</p>"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          className="min-h-56 p-4 bg-background text-foreground focus:outline-none
            [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-3 [&_h2]:mb-1
            [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:mt-2 [&_h3]:mb-1
            [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1
            [&_a]:text-primary [&_a]:underline
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul>li]:text-sm
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol>li]:text-sm
            [&_strong]:font-bold [&_em]:italic [&_u]:underline
            [&_hr]:border-border [&_hr]:my-2
            [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
            [&_th]:bg-muted [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold
            [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1"
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboardContent() {
  const { state, updatePortalSettings } = useApp();
  const ps = state.portalSettings;

  const [welcomeTitle, setWelcomeTitle] = useState(ps.welcomeTitle ?? '');
  const [welcomeMessage, setWelcomeMessage] = useState(ps.welcomeMessage ?? '');
  const [announcements, setAnnouncements] = useState(ps.announcements ?? '');
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = () => {
    updatePortalSettings({ welcomeTitle, welcomeMessage, announcements });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const previewSettings = { ...ps, welcomeTitle, welcomeMessage, announcements };
  const previewUser = state.currentUser;

  return (
    <PortalLayout title="Dashboard Content">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-primary" />
            <p className="text-sm text-muted-foreground">
              Configure the welcome message and announcements shown on Student, Faculty, and OCS dashboards.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(p => !p)}
              className="flex items-center gap-1.5"
            >
              <Eye size={14} />
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
            >
              {saved ? <><CheckCircle size={14} /> Saved!</> : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="rounded-lg border border-dashed border-primary/40 p-4 bg-primary/5">
            <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide mb-3">Preview</p>
            {(welcomeTitle || welcomeMessage || announcements) ? (
              <DashboardAnnouncements portalSettings={previewSettings} user={previewUser} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No content to preview. Fill in the fields below.</p>
            )}
          </div>
        )}

        {/* Two-panel editor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Welcome Panel Editor — Maroon theme */}
          <div className="portal-panel flex flex-col">
            <div className="portal-panel-header">
              <User size={15} className="text-muted-foreground" />
              <span>Welcome Panel</span>
            </div>
            <div className="p-5 space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Welcome Title</Label>
                <Input
                  value={welcomeTitle}
                  onChange={e => { setWelcomeTitle(e.target.value); setSaved(false); }}
                  placeholder="e.g. Welcome to the Academic Information System"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Headline shown below the personalized greeting.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Welcome Message</Label>
                <textarea
                  value={welcomeMessage}
                  onChange={e => { setWelcomeMessage(e.target.value); setSaved(false); }}
                  placeholder="e.g. This portal provides access to your academic records, enlistment, and more."
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="text-xs text-muted-foreground">Paragraph text shown in the welcome card. Plain text with line breaks supported.</p>
              </div>
            </div>
          </div>

          {/* Announcements Editor — Green theme */}
          <div className="portal-panel flex flex-col">
            <div className="portal-panel-header">
              <Bell size={15} className="text-muted-foreground" />
              <span>Announcements</span>
            </div>
            <div className="p-5 space-y-3 flex-1">
              <p className="text-xs text-muted-foreground">
                Use the toolbar to format announcements. Supports bold, italic, headings, lists, links, tables, fill color, and dividers.
                Switch to <strong>Source</strong> to edit raw HTML.
              </p>
              <RichTextEditor
                key={ps.announcements ?? ''}
                initialValue={announcements}
                onChange={val => { setAnnouncements(val); setSaved(false); }}
              />
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="flex justify-end pt-2 border-t border-border">
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
          >
            {saved ? <><CheckCircle size={16} /> Changes Saved!</> : 'Save All Changes'}
          </Button>
        </div>
      </div>
    </PortalLayout>
  );
}
