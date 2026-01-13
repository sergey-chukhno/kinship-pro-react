import React, { useState } from 'react';
import './Modal.css';

interface MemberCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<{
    created: Array<{ email: string; name: string; temporary_email?: boolean }>;
    existing: Array<{ email: string; name: string }>;
    errors: string[];
    warnings?: string[];
  }>;
  isSchool?: boolean;
}

const MemberCsvImportModal: React.FC<MemberCsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  isSchool = false
}) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResults, setImportResults] = useState<{
    created: Array<{ email: string; name: string; temporary_email?: boolean }>;
    existing: Array<{ email: string; name: string }>;
    errors: string[];
    warnings?: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        alert('Le fichier doit être au format CSV');
        return;
      }
      setCsvFile(file);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!csvFile) {
      alert('Veuillez sélectionner un fichier CSV');
      return;
    }

    setIsUploading(true);
    try {
      const results = await onImport(csvFile);
      setImportResults(results);
    } catch (error: any) {
      setImportResults({
        created: [],
        existing: [],
        errors: [error.response?.data?.message || error.message || 'Erreur lors de l\'import'],
        warnings: []
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setCsvFile(null);
    setImportResults(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2>Importer des membres depuis un CSV</h2>
          <button className="modal-close" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {!importResults ? (
            <>
              <div className="form-group">
                <label htmlFor="csvFile">Sélectionner un fichier CSV</label>
                <input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="form-input"
                  disabled={isUploading}
                />
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Format attendu: Prénom (requis), Nom (requis), Date de naissance (requis), Adresse e-mail (optionnel)
                  {isSchool && ', Classe (optionnel)'}
                </p>
              </div>

              {csvFile && (
                <div style={{
                  padding: '1rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  marginTop: '1rem'
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    <i className="fas fa-file-csv" style={{ marginRight: '0.5rem' }}></i>
                    {csvFile.name}
                  </p>
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: '1.5rem', padding: 0, borderTop: 'none' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={isUploading}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={!csvFile || isUploading}
                >
                  {isUploading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload" style={{ marginRight: '0.5rem' }}></i>
                      Importer
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                {importResults.created.length > 0 && (
                  <div style={{
                    padding: '1rem',
                    background: '#d1fae5',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid #10b981'
                  }}>
                    <p style={{ margin: 0, color: '#065f46', fontWeight: 600 }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '0.5rem' }}></i>
                      {importResults.created.length} membre(s) créé(s) avec succès
                    </p>
                  </div>
                )}

                {importResults.existing.length > 0 && (
                  <div style={{
                    padding: '1rem',
                    background: '#dbeafe',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid #3b82f6'
                  }}>
                    <p style={{ margin: 0, color: '#1e40af', fontWeight: 600 }}>
                      <i className="fas fa-info-circle" style={{ marginRight: '0.5rem' }}></i>
                      {importResults.existing.length} membre(s) existant(s) ignoré(s)
                    </p>
                  </div>
                )}

                {importResults.warnings && importResults.warnings.length > 0 && (
                  <div style={{
                    padding: '1rem',
                    background: '#fef3c7',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid #f59e0b'
                  }}>
                    <p style={{ margin: 0, color: '#92400e', fontWeight: 600, marginBottom: '0.5rem' }}>
                      <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                      {importResults.warnings.length} avertissement(s)
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
                      {importResults.warnings.map((warning, index) => (
                        <li key={index} style={{ marginBottom: '0.25rem' }}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResults.errors.length > 0 && (
                  <div style={{
                    padding: '1rem',
                    background: '#fee2e2',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    border: '1px solid #ef4444'
                  }}>
                    <p style={{ margin: 0, color: '#991b1b', fontWeight: 600, marginBottom: '0.5rem' }}>
                      <i className="fas fa-exclamation-circle" style={{ marginRight: '0.5rem' }}></i>
                      {importResults.errors.length} erreur(s)
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem', maxHeight: '200px', overflowY: 'auto' }}>
                      {importResults.errors.map((error, index) => (
                        <li key={index} style={{ marginBottom: '0.25rem' }}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', padding: 0, borderTop: 'none' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleClose}
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberCsvImportModal;

