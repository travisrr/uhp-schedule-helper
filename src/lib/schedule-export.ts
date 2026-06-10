import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PRINT_ROOT_ID = "schedule-print-root";

export function getSchedulePrintRoot(): HTMLElement | null {
  return document.getElementById(PRINT_ROOT_ID);
}

export function printSchedule(): void {
  const root = getSchedulePrintRoot();
  if (!root) return;
  window.print();
}

export async function saveScheduleAsPdf(filename: string): Promise<void> {
  const root = getSchedulePrintRoot();
  if (!root) return;

  const canvas = await html2canvas(root, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    width: root.scrollWidth,
    height: root.scrollHeight,
    windowWidth: root.scrollWidth,
    windowHeight: root.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function buildScheduleExportFilename(
  weekStartDate?: string | null,
): string {
  const base = weekStartDate
    ? `shift-report-${weekStartDate}`
    : "shift-report";
  return `${base}.pdf`;
}
