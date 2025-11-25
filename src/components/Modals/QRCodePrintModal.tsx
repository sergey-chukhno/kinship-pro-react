import React, { useEffect, useRef } from 'react';
import './Modal.css';

interface QRCodePrintModalProps {
  onClose: () => void;
  claimToken: string;
  studentName: string;
}

const QRCodePrintModal: React.FC<QRCodePrintModalProps> = ({ onClose, claimToken, studentName }) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const confirmationUrl = `http://localhost:3001/login?confirmation_token=${claimToken}`;

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
    alert('Lien copié dans le presse-papier !');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl relative" onClick={(e) => e.stopPropagation()}>
        {/* <div className="modal-header"> */}

          <button className="modal-close print:hidden absolute top-0 right-0" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        {/* </div> */}

        <div className="modal-body text-center p-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                QR Code d'activation pour {studentName}
              </h3>
              <p className="text-gray-500 text-base">
                Scannez ce QR code pour activer le compte de l'étudiant
              </p>
            </div>
            
            <div 
              ref={qrCodeRef}
              className="flex justify-center items-center mx-auto my-8 p-6 bg-white border-2 border-gray-200 rounded-xl shadow-md max-w-xs print:border-black print:shadow-none"
            ></div>
            
            <div className="mt-8 p-6 bg-gray-50 rounded-lg text-left space-y-4 print:border print:border-gray-300">
              <div className="break-all">
                <p className="font-semibold text-gray-700 mb-1">Lien d'activation :</p>
                <span className="text-blue-500 text-sm">{confirmationUrl}</span>
              </div>
              <div className="break-all">
                <p className="font-semibold text-gray-700 mb-1">Token :</p>
                <code className="bg-gray-200 px-2 py-1 rounded text-xs text-gray-800">
                  {claimToken}
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer print:hidden">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            <i className="fas fa-times mr-2"></i>
            Fermer
          </button>
          <button type="button" className="btn btn-outline" onClick={handleCopyLink}>
            <i className="fas fa-copy mr-2"></i>
            Copier le lien
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <i className="fas fa-print mr-2"></i>
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

