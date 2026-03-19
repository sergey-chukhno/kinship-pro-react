import React, { useEffect, useRef } from 'react';
import './Modal.css';
import { useToast } from '../../hooks/useToast';

interface ShareEventLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
}

const ShareEventLinkModal: React.FC<ShareEventLinkModalProps> = ({ isOpen, onClose, token }) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const { showSuccess } = useToast();

  const shareUrl = token ? `${process.env.REACT_APP_FRONTEND_URL}/shared-event/${token}` : '';

  useEffect(() => {
    if (!isOpen || !token || !shareUrl) return;

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.async = true;
    script.onload = () => {
      if (qrCodeRef.current && (window as any).QRCode) {
        qrCodeRef.current.innerHTML = '';
        new (window as any).QRCode(qrCodeRef.current, {
          text: shareUrl,
          width: 220,
          height: 220,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: (window as any).QRCode.CorrectLevel.H
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [isOpen, token, shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    showSuccess('Lien copié dans le presse-papier !');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Partager l&apos;événement</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="modal-body">
          <div className="space-y-4">
            <p className="text-gray-600">
              Toute personne disposant de ce lien pourra consulter les informations de l&apos;événement et le rejoindre.
            </p>

            <div className="share-link-field">
              <label className="field-label">Lien de partage</label>
              <div className="share-link-row">
                <input type="text" readOnly value={shareUrl} className="share-link-input" />
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <div ref={qrCodeRef} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Fermer
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCopyLink}
            disabled={!shareUrl}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <i className="fas fa-copy" /> Copier le lien
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareEventLinkModal;

