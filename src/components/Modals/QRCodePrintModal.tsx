import React, { useEffect, useRef } from 'react';
import './Modal.css';
import { useToast } from '../../hooks/useToast';

interface QRCodePrintModalProps {
  onClose: () => void;
  claimToken: string;
  studentName: string;
}

const QRCodePrintModal: React.FC<QRCodePrintModalProps> = ({ onClose, claimToken, studentName }) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const { showSuccess } = useToast();
  const confirmationUrl = `${process.env.REACT_APP_FRONTEND_URL}/checkin-student?confirmation_token=${claimToken}`;

  useEffect(() => {
    // Dynamically load QRCode library
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.async = true;
    script.onload = () => {
      if (qrCodeRef.current && (window as any).QRCode) {
        // Clear previous QR code if any
        qrCodeRef.current.innerHTML = '';
        
        // Generate QR code
        new (window as any).QRCode(qrCodeRef.current, {
          text: confirmationUrl,
          width: 256,
          height: 256,
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
  }, [confirmationUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(confirmationUrl);
    showSuccess('Lien copié dans le presse-papier !');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="relative max-w-2xl modal-content" onClick={(e) => e.stopPropagation()}>
        {/* <div className="modal-header"> */}

          <button className="absolute top-0 right-0 modal-close print:hidden" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        {/* </div> */}

        <div className="p-8 text-center modal-body">
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-2xl font-semibold text-gray-800">
                QR Code d'activation pour {studentName}
              </h3>
              <p className="text-base text-gray-500">
                Scannez ce QR code pour activer le compte de l'étudiant
              </p>
            </div>
            
            <div 
              ref={qrCodeRef}
              className="flex justify-center items-center p-6 mx-auto my-8 max-w-xs bg-white rounded-xl border-2 border-gray-200 shadow-md print:border-black print:shadow-none"
            ></div>
            
            <div className="p-6 mt-8 space-y-4 text-left bg-gray-50 rounded-lg print:border print:border-gray-300">
              <div className="break-all">
                <p className="mb-1 font-semibold text-gray-700">Lien d'activation :</p>
                <span className="text-sm text-blue-500">{confirmationUrl}</span>
              </div>
              <div className="break-all">
                <p className="mb-1 font-semibold text-gray-700">Token :</p>
                <code className="px-2 py-1 text-xs text-gray-800 bg-gray-200 rounded">
                  {claimToken}
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer print:hidden">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            <i className="mr-2 fas fa-times"></i>
            Fermer
          </button>
          <button type="button" className="btn btn-outline" onClick={handleCopyLink}>
            <i className="mr-2 fas fa-copy"></i>
            Copier le lien
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <i className="mr-2 fas fa-print"></i>
            Imprimer
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          .modal-overlay {
            background: white !important;
          }

          .modal-content {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default QRCodePrintModal;

