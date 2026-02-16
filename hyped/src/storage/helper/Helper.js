import RNFS from 'react-native-fs';

/**
 * Download a file from a URL to the app document directory.
 * @param {string} fileUri - Remote URL
 * @param {string} fileName - Local file name
 * @param {string} [fileSize] - Optional size (unused, for API compatibility)
 * @param {string} [mimeType] - Optional MIME type (unused, for API compatibility)
 * @returns {Promise<string|null>} Local file path or null on failure
 */
export async function downloadFile(fileUri, fileName, fileSize, mimeType) {
  if (!fileUri || typeof fileUri !== 'string' || !fileUri.startsWith('http')) {
    return null;
  }
  try {
    const dir = RNFS.DocumentDirectoryPath + '/chat_media';
    const exists = await RNFS.exists(dir);
    if (!exists) {
      await RNFS.mkdir(dir);
    }
    const safeName = (fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const localPath = `${dir}/${Date.now()}_${safeName}`;
    await RNFS.downloadFile({ fromUrl: fileUri, toFile: localPath }).promise;
    return localPath;
  } catch (err) {
    console.warn('[Helper] downloadFile error:', err?.message || err);
    return null;
  }
}
