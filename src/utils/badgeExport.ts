import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Badge } from '../types';

interface ExportFilters {
  series: string;
  level: string;
  searchTerm: string;
}

interface ExportContext {
  showingPageType: 'user' | 'pro' | 'edu' | 'teacher';
  organizationId?: number;
  organizationName?: string;
}

/**
 * Export badge cartography to PDF
 * Includes list of badges and visual cartography representation
 */
export const exportToPDF = async (
  badges: Badge[],
  filters: ExportFilters,
  context: ExportContext
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Add title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Cartographie des badges', margin, yPosition);
      yPosition += 10;

      // Add metadata
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const exportDate = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      pdf.text(`Exporté le: ${exportDate}`, margin, yPosition);
      yPosition += 5;

      if (context.organizationName) {
        pdf.text(`Organisation: ${context.organizationName}`, margin, yPosition);
        yPosition += 5;
      }

      if (filters.series) {
        // Map series name for display
        const mapSeriesForDisplay = (series: string): string => {
          if (!series) return '';
          const lower = series.toLowerCase();
          if (lower.includes('toukouleur') || lower.includes('universelle')) {
            return 'Série Soft Skills 4LAB';
          }
          return series;
        };
        const seriesDisplayName = mapSeriesForDisplay(filters.series);
        pdf.text(`Série: ${seriesDisplayName}`, margin, yPosition);
        yPosition += 5;
      }

      if (filters.level) {
        pdf.text(`Niveau: ${filters.level}`, margin, yPosition);
        yPosition += 5;
      }

      yPosition += 5;

      // Add badge list table
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Liste des badges', margin, yPosition);
      yPosition += 8;

      // Table headers
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Badge', margin, yPosition);
      pdf.text('Niveau', margin + 60, yPosition);
      pdf.text('Description', margin + 90, yPosition);
      pdf.text('Attributions', margin + 150, yPosition);
      yPosition += 5;

      // Group badges by name and level to show unique badges with counts
      const badgeGroups = badges.reduce((acc, badge) => {
        const key = `${badge.name}|${badge.level}`;
        if (!acc[key]) {
          acc[key] = {
            name: badge.name,
            level: badge.level,
            description: badge.description,
            count: 0
          };
        }
        acc[key].count += 1;
        return acc;
      }, {} as Record<string, { name: string; level: string; description: string; count: number }>);

      // Table rows - show unique badges with attribution counts
      pdf.setFont('helvetica', 'normal');
      Object.values(badgeGroups).forEach((badgeGroup) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }

        const badgeName = badgeGroup.name.length > 25 ? badgeGroup.name.substring(0, 22) + '...' : badgeGroup.name;
        const description = badgeGroup.description.length > 30 ? badgeGroup.description.substring(0, 27) + '...' : badgeGroup.description;

        pdf.text(badgeName, margin, yPosition);
        pdf.text(badgeGroup.level, margin + 60, yPosition);
        pdf.text(description, margin + 90, yPosition);
        pdf.text(badgeGroup.count.toString(), margin + 150, yPosition);
        yPosition += 6;
      });

      // Add visual cartography (capture from DOM)
      // Note: This requires the cartography view to be rendered
      // We'll add this as a second page if possible
      const cartographyElement = document.querySelector('.badge-cartography-view');
      if (cartographyElement) {
        pdf.addPage();
        yPosition = margin;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Représentation visuelle', margin, yPosition);
        yPosition += 10;

        html2canvas(cartographyElement as HTMLElement, {
          useCORS: true,
          logging: false
        }).then((canvas) => {
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (imgHeight > pageHeight - margin * 2) {
            // Image too tall, scale it down
            const scaledHeight = pageHeight - margin * 2;
            const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
            pdf.addImage(imgData, 'PNG', margin, margin, scaledWidth, scaledHeight);
          } else {
            pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
          }

          pdf.save(`cartographie-badges-${Date.now()}.pdf`);
          resolve();
        }).catch((error) => {
          // If visual capture fails, just save the PDF with the list
          pdf.save(`cartographie-badges-${Date.now()}.pdf`);
          resolve();
        });
      } else {
        // No visual element, just save the PDF with the list
        pdf.save(`cartographie-badges-${Date.now()}.pdf`);
        resolve();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
};

/**
 * Export badge cartography to CSV
 * Basic format: Badge Name, Level, Series, Attribution Count
 */
export const exportToCSV = (badges: Badge[], filters: ExportFilters): void => {
  try {
    // CSV Headers
    const headers = ['Nom du badge', 'Niveau', 'Série', 'Nombre d\'attributions'];
    
    // Helper function to map series name for display
    const mapSeriesForDisplay = (series: string): string => {
      if (series.toLowerCase().includes('toukouleur') || series.toLowerCase().includes('universelle')) {
        return 'Série Soft Skills 4LAB';
      }
      return series;
    };
    
    // Group badges by name and level to show unique badges with counts
    const badgeGroups = badges.reduce((acc, badge) => {
      const key = `${badge.name}|${badge.level}`;
      if (!acc[key]) {
        const seriesDisplay = mapSeriesForDisplay(badge.category || badge.series || '');
        acc[key] = {
          name: badge.name,
          level: badge.level,
          category: seriesDisplay,
          count: 0
        };
      }
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { name: string; level: string; category: string; count: number }>);

    // CSV Rows - show unique badges with attribution counts
    const rows = Object.values(badgeGroups).map(badgeGroup => [
      `"${badgeGroup.name.replace(/"/g, '""')}"`,
      `"${badgeGroup.level.replace(/"/g, '""')}"`,
      `"${badgeGroup.category.replace(/"/g, '""')}"`,
      badgeGroup.count.toString()
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `cartographie-badges-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw error;
  }
};

/**
 * Generate shareable link for badge cartography
 * Calls backend API to create a shareable link with token
 */
export const generateShareableLink = async (
  filters: ExportFilters,
  context: ExportContext
): Promise<string> => {
  try {
    const { createBadgeCartographyShare } = await import('../api/BadgeCartography');
    const result = await createBadgeCartographyShare(filters, context);
    return result.shareable_url;
  } catch (error: any) {
    console.error('Error generating shareable link:', error);
    throw new Error(error.response?.data?.error || 'Erreur lors de la génération du lien');
  }
};

