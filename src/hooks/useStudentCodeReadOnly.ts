import { useAppContext } from '../context/AppContext';
import { useToast } from './useToast';
import {
  guardWriteUntilEmailVerified,
  isReadOnlyUntilEmail,
  STUDENT_CODE_NEED_VERIFIED_EMAIL,
} from '../utils/studentCodeAccess';

/** Ticket 57 Phase 1a — block write/share UI until verified email. */
export function useStudentCodeReadOnly() {
  const { state } = useAppContext();
  const { showError } = useToast();
  const readOnly = isReadOnlyUntilEmail(state.user);

  const guardWrite = (): boolean =>
    guardWriteUntilEmailVerified(state.user, (msg) => showError(msg));

  return {
    readOnly,
    guardWrite,
    needVerifiedEmailMessage: STUDENT_CODE_NEED_VERIFIED_EMAIL,
  };
}
