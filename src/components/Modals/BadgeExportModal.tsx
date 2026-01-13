import React, { useState } from 'react';
import { Badge } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import { exportToPDF, exportToCSV, generateShareableLink } from '../../utils/badgeExport';
import './Modal.css';
import './BadgeExportModal.css';

interface BadgeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Badge[]; // Filtered badges to export
  filters: {
    series: string;
    level: string;
    searchTerm: string;
  };
  context: {
    showingPageType: 'user' | 'pro' | 'edu' | 'teacher';
    organizationId?: number;
    organizationName?: string;
  };
}

const BadgeExportModal: React.FC<BadgeExportModalProps> = ({
  isOpen,
  onClose,
  badges,
  filters,
  context
}) => {
  const { state } = useAppContext();
  const { showSuccess, showError } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingCSV, setIsGeneratingCSV] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await exportToPDF(badges, filters, context);
      showSuccess('PDF exporté avec succès');
      onClose();
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      showError('Erreur lors de l\'export PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    setIsGeneratingCSV(true);
    try {
      exportToCSV(badges, filters);
      showSuccess('CSV exporté avec succès');
      onClose();
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      showError('Erreur lors de l\'export CSV');
    } finally {
      setIsGeneratingCSV(false);
    }
  };

  const handleGenerateLink = async () => {
    setIsGeneratingLink(true);
    try {
      const link = await generateShareableLink(filters, context);
      setShareableLink(link);
      showSuccess('Lien partageable généré avec succès');
    } catch (error: any) {
      console.error('Error generating shareable link:', error);
      showError('Erreur lors de la génération du lien');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
      showSuccess('Lien copié dans le presse-papier');
    }
  };

  const getExpirationDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 90);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content badge-export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Exporter la cartographie des badges</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body badge-export-body">
          <p className="badge-export-description">
            Choisissez un format d'export pour la cartographie actuelle ({badges.length} badge{badges.length > 1 ? 's' : ''}).
          </p>

          <div className="badge-export-options">
            {/* PDF Export Option */}
            <div className="badge-export-option">
              <div className="badge-export-option-header">
                <div className="badge-export-option-icon pdf">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div className="badge-export-option-info">
                  <h3>Export PDF</h3>
                  <p>Liste des badges avec descriptions et représentation visuelle de la cartographie</p>
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleExportPDF}
                disabled={isGeneratingPDF || badges.length === 0}
              >
                {isGeneratingPDF ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Génération...
                  </>
                ) : (
                  <>
                    <i className="fas fa-download"></i>
                    Télécharger PDF
                  </>
                )}
              </button>
            </div>

            {/* CSV Export Option */}
            <div className="badge-export-option">
              <div className="badge-export-option-header">
                <div className="badge-export-option-icon csv">
                  <i className="fas fa-file-csv"></i>
                </div>
                <div className="badge-export-option-info">
                  <h3>Export CSV</h3>
                  <p>Fichier CSV avec les informations de base de chaque badge</p>
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleExportCSV}
                disabled={isGeneratingCSV || badges.length === 0}
              >
                {isGeneratingCSV ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Génération...
                  </>
                ) : (
                  <>
                    <i className="fas fa-download"></i>
                    Télécharger CSV
                  </>
                )}
              </button>
            </div>

            {/* Shareable Link Option */}
            <div className="badge-export-option">
              <div className="badge-export-option-header">
                <div className="badge-export-option-icon link">
                  <i className="fas fa-link"></i>
                </div>
                <div className="badge-export-option-info">
                  <h3>Lien partageable</h3>
                  <p>Générer un lien sécurisé pour partager la cartographie (expire dans 90 jours)</p>
                </div>
              </div>
              {!shareableLink ? (
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateLink}
                  disabled={isGeneratingLink || badges.length === 0}
                >
                  {isGeneratingLink ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Génération...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-link"></i>
                      Générer le lien
                    </>
                  )}
                </button>
              ) : (
                <div className="badge-export-link-result">
                  <div className="badge-export-link-display">
                    <input
                      type="text"
                      value={shareableLink}
                      readOnly
                      className="badge-export-link-input"
                    />
                    <button
                      className="btn btn-outline badge-export-copy-btn"
                      onClick={handleCopyLink}
                    >
                      <i className="fas fa-copy"></i>
                      Copier
                    </button>
                  </div>
                  <p className="badge-export-link-expiry">
                    <i className="fas fa-clock"></i>
                    Expire le {getExpirationDate()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeExportModal;



