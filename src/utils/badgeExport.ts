import jsPDF from 'jspdf';
import { Badge } from '../types';
import { getLocalBadgeImage } from './badgeImages';

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

/** Map stored "Domaine d'engagement" value to readable French label for PDF */
const DOMAINE_ENGAGEMENT_LABELS: Record<string, string> = {
  professionnel: "Activité professionnelle (CDI, CDD, contrat d'alternance, job d'été,...)",
  scolaire: 'Cadre scolaire (projet, études,...)',
  associatif: 'Cadre associatif ou sportif (Projet, séjours)',
  experience: 'Expérience professionnelle (Formation, Stage en entreprise...)'
};

function getDomaineEngagementLabel(value: string | null | undefined): string {
  if (!value || !value.trim()) return 'Non renseigné';
  const label = DOMAINE_ENGAGEMENT_LABELS[value.trim().toLowerCase()];
  return label ?? value;
}

/** One attribution block for PDF export (per-attribution layout) */
export interface AttributionForExport {
  badgeImageUrl?: string;
  badgeTitle: string;
  badgeLevel: string;
  attributionDate: string;
  attributedByName: string;
  attributedToName: string;
  domaine: string[];
  competencesIndiquees: string[];
  projectTitle?: string;
  projectDescription?: string;
  comment?: string;
  proofFileNames: string[];
}

/**
 * Map raw user_badge API response (school/company/teacher or user serializer) to AttributionForExport
 */
export function mapRawUserBadgeToAttributionForExport(raw: any): AttributionForExport {
  const badge = raw?.badge || {};
  const name = badge.name || '';
  const level = badge.level || 'level_1';
  const levelDisplay = level.replace('level_', '');
  const series = badge.series || '';
  // Use "Domaine d'engagement" (stored at attribution); show readable French label or "Non renseigné"
  const domaineEngagementRaw = raw?.domaine_engagement ?? raw?.domaineEngagement;
  const domaineDisplay = [getDomaineEngagementLabel(domaineEngagementRaw)];
  const skillsIndicated = raw?.skills_indicated ?? raw?.skillsIndicated ?? [];
  const project = raw?.project;
  const projectTitle = project?.title ?? raw?.project_title;
  const projectDescription = project?.description ?? raw?.project_description;
  const documents = raw?.documents || [];
  const proofFileNames = documents.map((doc: any) => doc?.name || doc?.filename || 'Document').filter(Boolean);
  const assignedAt = raw?.assigned_at ?? raw?.created_at;
  const dateStr =
    assignedAt &&
    new Date(assignedAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  const sender = raw?.sender;
  const receiver = raw?.receiver;
  const badgeImageUrl =
    badge?.image_url ||
    (typeof getLocalBadgeImage === 'function' ? getLocalBadgeImage(name, level, series) : undefined);

  return {
    badgeImageUrl,
    badgeTitle: name,
    badgeLevel: `Niveau ${levelDisplay}`,
    attributionDate: dateStr || '',
    attributedByName: sender?.full_name ?? '',
    attributedToName: receiver?.full_name ?? '',
    domaine: domaineDisplay,
    competencesIndiquees: Array.isArray(skillsIndicated) ? skillsIndicated : [],
    projectTitle: projectTitle ?? undefined,
    projectDescription: projectDescription ?? undefined,
    comment: raw?.comment ?? undefined,
    proofFileNames
  };
}

/**
 * Export badge cartography to PDF.
 * If attributions is non-empty, uses per-attribution layout (one block per attribution).
 * Otherwise falls back to aggregated table (Liste des badges with counts).
 * Second page "Représentation visuelle" is removed.
 */
export const exportToPDF = async (
  attributions: AttributionForExport[] | null,
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
      const lineHeight = 5;
      const blockGap = 10;
      const headerGap = 12;
      const metadataLineGap = 6;
      const blockTitleGap = 4;
      const wrapThreshold = 40;
      let yPosition = margin;

      const mapSeriesForDisplay = (series: string): string => {
        if (!series) return '';
        const lower = series.toLowerCase();
        if (lower.includes('toukouleur') || lower.includes('universelle')) return 'Série Soft Skills 4LAB';
        return series;
      };

      // ----- Header (same for both modes) -----
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Cartographie des badges', margin, yPosition);
      yPosition += headerGap;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += metadataLineGap;

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
      yPosition += metadataLineGap;
      if (context.organizationName) {
        pdf.text(`Organisation: ${context.organizationName}`, margin, yPosition);
        yPosition += metadataLineGap;
      }
      if (filters.series) {
        pdf.text(`Série: ${mapSeriesForDisplay(filters.series)}`, margin, yPosition);
        yPosition += metadataLineGap;
      }
      if (filters.level) {
        pdf.text(`Niveau: ${filters.level}`, margin, yPosition);
        yPosition += metadataLineGap;
      }
      yPosition += 8;

      if (attributions && attributions.length > 0) {
        // ----- Per-attribution layout -----
        const iconSize = 18;
        const textStartX = margin + iconSize + 8;
        const maxTextWidth = pageWidth - margin - textStartX;

        const pushLine = (label: string, value: string, wrap = true) => {
          if (yPosition > pageHeight - 25) {
            pdf.addPage();
            yPosition = margin;
          }
          if (!value) return;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text(label, textStartX, yPosition);
          pdf.setFont('helvetica', 'normal');
          if (wrap && value.length > wrapThreshold) {
            yPosition += lineHeight; // value starts on next line so label and value do not overlap
            const lines = pdf.splitTextToSize(value, maxTextWidth);
            lines.forEach((line: string) => {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = margin;
              }
              pdf.text(line, textStartX, yPosition);
              yPosition += lineHeight;
            });
          } else {
            const labelWidth = pdf.getTextDimensions(label).w;
            const valueX = textStartX + labelWidth + 2; // small gap between label and value
            pdf.text(value, valueX, yPosition);
            yPosition += lineHeight;
          }
        };

        for (let i = 0; i < attributions.length; i++) {
          const a = attributions[i];
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          if (i > 0) {
            yPosition += 4;
            pdf.setDrawColor(220, 220, 220);
            pdf.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += blockGap;
          }

          yPosition += blockTitleGap;
          if (a.badgeImageUrl) {
            try {
              pdf.addImage(a.badgeImageUrl, 'PNG', margin, yPosition, iconSize, iconSize);
            } catch {
              // ignore image load errors
            }
          }
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text(a.badgeTitle, textStartX, yPosition + 4);
          pdf.setFont('helvetica', 'normal');
          yPosition += lineHeight + blockTitleGap;
          pushLine('Niveau : ', a.badgeLevel, false);
          pushLine('Date d\'attribution : ', a.attributionDate, false);
          pushLine('Attribué par : ', a.attributedByName, false);
          pushLine('Attribué à : ', a.attributedToName, false);
          pushLine("Domaine d'engagement : ", a.domaine.join(', '), true);
          if (a.competencesIndiquees.length) pushLine('Compétences indiquées : ', a.competencesIndiquees.join(', '), true);
          if (a.projectTitle) pushLine('Projet : ', a.projectTitle, true);
          if (a.projectDescription) pushLine('Description projet : ', a.projectDescription, true);
          if (a.comment) pushLine('Commentaire : ', a.comment, true);
          if (a.proofFileNames.length) pushLine('Preuve(s) : ', a.proofFileNames.join(', '), true);
          yPosition += blockGap;
        }
      } else {
        // ----- Fallback: aggregated table -----
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Liste des badges', margin, yPosition);
        yPosition += 8;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Badge', margin, yPosition);
        pdf.text('Niveau', margin + 60, yPosition);
        pdf.text('Description', margin + 90, yPosition);
        pdf.text('Attributions', margin + 150, yPosition);
        yPosition += 5;

        const badgeGroups = badges.reduce((acc, badge) => {
          const key = `${badge.name}|${badge.level}`;
          if (!acc[key]) {
            acc[key] = { name: badge.name, level: badge.level, description: badge.description || '', count: 0 };
          }
          acc[key].count += 1;
          return acc;
        }, {} as Record<string, { name: string; level: string; description: string; count: number }>);

        pdf.setFont('helvetica', 'normal');
        Object.values(badgeGroups).forEach((bg) => {
          if (yPosition > pageHeight - 30) {
            pdf.addPage();
            yPosition = margin;
          }
          const badgeName = bg.name.length > 25 ? bg.name.substring(0, 22) + '...' : bg.name;
          const description = (bg.description || '').length > 30 ? bg.description.substring(0, 27) + '...' : bg.description;
          pdf.text(badgeName, margin, yPosition);
          pdf.text(bg.level, margin + 60, yPosition);
          pdf.text(description, margin + 90, yPosition);
          pdf.text(bg.count.toString(), margin + 150, yPosition);
          yPosition += 6;
        });
      }

      pdf.save(`cartographie-badges-${Date.now()}.pdf`);
      resolve();
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

