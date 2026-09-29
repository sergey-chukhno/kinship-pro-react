export type ProjectLifecycleStatus =
  | 'draft'
  | 'to_process'
  | 'pending_validation'
  | 'coming'
  | 'in_progress'
  | 'ended'
  | 'archived';

export const isProjectReadOnly = (status?: ProjectLifecycleStatus | string | null): boolean => {
  return status === 'ended' || status === 'archived';
};

export const canOwnerCloseProject = (
  status?: ProjectLifecycleStatus | string | null,
  userProjectRole?: string | null,
  isReadOnlyMode?: boolean
): boolean => {
  return status === 'in_progress' && userProjectRole === 'owner' && !isReadOnlyMode;
};

export const shouldShowEndDateWarningBanner = (
  status?: ProjectLifecycleStatus | string | null,
  showEndDateWarning?: boolean
): boolean => {
  return status === 'in_progress' && Boolean(showEndDateWarning);
};

export const buildCloseProjectConfirmationMessage = (projectTitle: string, hasFunders = false): string => {
  const funderLine = hasFunders ? '— Vos financeurs recevront leur rapport\n' : '';
  return `Vous êtes sur le point de clôturer le projet ${projectTitle}.
Cette action est définitive et irréversible.
Une fois clôturé :
— Sa Preuve Projet est générée — authentique et vérifiable
${funderLine}— Le projet passe en lecture seule — plus aucune modification possible
— Les membres peuvent toujours le consulter et voir leurs preuves
— Vous pourrez ensuite l’archiver quand vous le souhaitez
Les données du projet sont conservées conformément au registre des traitements RGPD de Kinship.
Confirmez-vous la clôture définitive de ce projet ?`;
};
