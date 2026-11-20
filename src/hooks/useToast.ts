import { toast, ToastOptions } from 'react-toastify';
import { isSessionExpiredToastActive } from '../api/sessionExpiry';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const useToast = () => {
  const showSuccess = (message: string, options?: ToastOptions) => {
    toast.success(message, { ...defaultOptions, ...options });
  };

  const showError = (message: string, options?: ToastOptions) => {
    // Suppress generic API error toasts while session-expired flow is active
    // (avoids a stack of "Erreur lors de la récupération…" on parallel 401s).
    if (isSessionExpiredToastActive()) return;
    toast.error(message, { ...defaultOptions, ...options });
  };

  const showInfo = (message: string, options?: ToastOptions) => {
    toast.info(message, { ...defaultOptions, ...options });
  };

  const showWarning = (message: string, options?: ToastOptions) => {
    toast.warning(message, { ...defaultOptions, ...options });
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
};
