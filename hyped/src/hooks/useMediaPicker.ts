import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
  ImageLibraryOptions,
  CameraOptions,
} from 'react-native-image-picker';
import { useAppSelector } from '../state/hooks';
import { getAppTranslations } from '../translations';
import { showPermissionDeniedWithSettings } from '../utils/permissions';
import { useMediaPermission } from './useMediaPermission';

type UseMediaPickerResult = {
  openCameraPicker: (onClose?: () => void) => Promise<void>;
  openGalleryPicker: (onClose?: () => void) => Promise<void>;
};

export function useMediaPicker(): UseMediaPickerResult {
  const navigation = useNavigation<any>();
  const lang = useAppSelector(state => state.language.lang);
  const t = getAppTranslations(lang);
  const { ensureCameraAccess, ensurePhotoLibraryAccess } = useMediaPermission();

  const navigateWithImages = useCallback(
    (assets: Asset[] | undefined | null, onClose?: () => void) => {
      const imageAssets = (assets ?? []).filter(
        a => !!a.uri && a.type?.startsWith('image/'),
      );

      if (!imageAssets.length) {
        return;
      }

      // Prefer navigating on the root navigator if available so this works
      // even when called from nested navigators.
      const rootNav =
        (navigation as any)?.getParent?.() || navigation;

      rootNav.navigate('SelectedFiles', {
        assets: imageAssets,
      });

      onClose?.();
    },
    [navigation],
  );

  const openCameraPicker = useCallback(
    async (onClose?: () => void) => {
      const granted = await ensureCameraAccess();
      if (!granted) {
        showPermissionDeniedWithSettings(
          t.PermissionDenied,
          t.CameraPermissionRequired,
          t.Settings,
        );
        return;
      }

      const options: CameraOptions = {
        // We only need photos here – avoids unnecessary data for videos
        mediaType: 'photo',
        cameraType: 'back',
        // Return a **heavily downscaled** base64 preview to keep payload tiny
        // These dimensions + quality keep the string very small while still usable as a thumbnail.
        includeBase64: true,
        maxWidth: 160,
        maxHeight: 160,
        quality: 0.4,
      };

      const result = await launchCamera(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        console.warn('[useMediaPicker] camera error:', result.errorMessage);
        return;
      }

      navigateWithImages(result.assets, onClose);
    },
    [ensureCameraAccess, navigateWithImages, t],
  );

  const openGalleryPicker = useCallback(
    async (onClose?: () => void) => {
      const granted = await ensurePhotoLibraryAccess();
      if (!granted) {
        showPermissionDeniedWithSettings(
          t.PermissionDenied,
          t.PhotoLibraryPermissionRequired,
          t.Settings,
        );
        return;
      }

      const options: ImageLibraryOptions = {
        // Only pick images for this flow
        mediaType: 'photo',
        selectionLimit: 5,
        // Return a tiny, low‑quality base64 thumbnail for each image
        includeBase64: true,
        maxWidth: 160,
        maxHeight: 160,
        quality: 0.4,
      };

      const result = await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        console.warn('[useMediaPicker] gallery error:', result.errorMessage);
        return;
      }

      navigateWithImages(result.assets, onClose);
    },
    [ensurePhotoLibraryAccess, navigateWithImages, t],
  );

  return {
    openCameraPicker,
    openGalleryPicker,
  };
}

