import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns true if a course should be excluded from GWA and unit count (HK, PE, NSTP) */
export function isNonAcademicCourse(course: { isPE?: boolean; isNSTP?: boolean; code: string }): boolean {
  return !!(course.isPE || course.isNSTP || /^HK\b/i.test(course.code));
}

/** Opens a PDF data URL in a new tab using a Blob URL (bypasses browser data-URL popup blocks) */
export function openPdfPreview(dataUrl: string) {
  try {
    const parts = dataUrl.split(',');
    const byteString = atob(parts[1]);
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after short delay to allow the tab to load
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (e) {
    console.error('PDF preview error:', e);
  }
}
