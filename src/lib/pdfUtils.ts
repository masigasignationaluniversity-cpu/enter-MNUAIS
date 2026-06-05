/**
 * Captures a DOM element and downloads it as an A4 PDF.
 * Supports multi-page output when the content is taller than one A4 page.
 */
export async function downloadAsPdf(
  element: HTMLElement,
  filename: string,
  landscape = false
): Promise<void> {
  const [html2canvasMod, jspdfMod] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const html2canvas = html2canvasMod.default ?? html2canvasMod;
  const jsPDF = (jspdfMod.default ?? jspdfMod).jsPDF ?? (jspdfMod.default ?? jspdfMod);

  const canvas = await (html2canvas as (el: HTMLElement, opts: object) => Promise<HTMLCanvasElement>)(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = new (jsPDF as any)({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pw: number = pdf.internal.pageSize.getWidth();
  const ph: number = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const iw = pw - margin * 2;
  const ih = (canvas.height / canvas.width) * iw;

  // Multi-page: slice the image vertically by page height
  const pageContentH = ph - margin * 2;
  const totalPages = Math.ceil(ih / pageContentH);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();
    const yOffset = page * pageContentH;
    pdf.addImage(imgData, 'PNG', margin, margin - yOffset, iw, ih);
    // Clip region: white bars above/below content area
    if (totalPages > 1) {
      pdf.setFillColor(255, 255, 255);
      if (page > 0) pdf.rect(0, 0, pw, margin, 'F');
      if (page < totalPages - 1) pdf.rect(0, ph - margin, pw, margin, 'F');
    }
  }

  pdf.save(filename);
}
