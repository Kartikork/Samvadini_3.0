import { useCallback } from 'react';
import {
  ensureAudioPermission,
  ensureCameraPermission,
  ensureDocumentPermission,
  ensureLocationPermission,
  ensurePhotoLibraryPermission,
} from '../utils/permissions';

export type MediaPermissionType = 'camera' | 'photoLibrary' | 'document' | 'location' | 'audio';

export function useMediaPermission() {
  const ensurePermission = useCallback(async (type: MediaPermissionType): Promise<boolean> => {
    if (type === 'camera') return ensureCameraPermission();
    if (type === 'photoLibrary') return ensurePhotoLibraryPermission();
    if (type === 'document') return ensureDocumentPermission();
    if (type === 'location') return ensureLocationPermission();
    if (type === 'audio') return ensureAudioPermission();
    return false;
  }, []);

  const ensureCameraAccess = useCallback(() => ensureCameraPermission(), []);
  const ensurePhotoLibraryAccess = useCallback(() => ensurePhotoLibraryPermission(), []);
  const ensureDocumentAccess = useCallback(() => ensureDocumentPermission(), []);
  const ensureLocationAccess = useCallback(() => ensureLocationPermission(), []);
  const ensureAudioAccess = useCallback(() => ensureAudioPermission(), []);

  return {
    ensurePermission,
    ensureCameraAccess,
    ensurePhotoLibraryAccess,
    ensureDocumentAccess,
    ensureLocationAccess,
    ensureAudioAccess,
  };
}
