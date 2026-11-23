function getFirebaseErrorCode(error: unknown): string | null {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code.replace(/^firestore\//, '');
  }
  return null;
}

export function getFirebaseLoadErrorMessage(error: unknown, resource: string): string {
  const code = getFirebaseErrorCode(error);
  if (code === 'failed-precondition') {
    return `Could not load ${resource.toLowerCase()}. Ask KrishiBandhu support to check the Firestore index for this page.`;
  }
  if (code === 'permission-denied') {
    return `${resource} could not be loaded because Firestore denied access. Check your account role and the published security rules.`;
  }
  if (code === 'unauthenticated') {
    return `${resource} could not be loaded because your session is not authenticated. Sign in again and retry.`;
  }
  if (code === 'unavailable' || code === 'network-request-failed') {
    return `${resource} could not be loaded because the service is temporarily unavailable. Check your connection and retry.`;
  }
  return `${resource} could not be loaded${code ? ` (${code})` : ''}. Please retry.`;
}

export function getFirebaseOperationErrorMessage(error: unknown, operation: string): string {
  const code = getFirebaseErrorCode(error);
  if (code === 'permission-denied') {
    return `${operation} was not completed because Firestore denied access. Check your account role and the published security rules.`;
  }
  if (code === 'unauthenticated') {
    return `${operation} was not completed because your session is not authenticated. Sign in again and retry.`;
  }
  if (code === 'unavailable' || code === 'network-request-failed') {
    return `${operation} was not completed because the service is temporarily unavailable. Check your connection and retry.`;
  }
  return `${operation} was not confirmed${code ? ` (${code})` : ''}. Please retry.`;
}
