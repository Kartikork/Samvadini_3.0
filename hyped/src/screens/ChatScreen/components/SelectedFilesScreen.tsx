import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import ImageCropPicker from 'react-native-image-crop-picker';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

type SelectedFilesRouteParams = {
  assets?: any[];
  onComplete?: (files: any[], caption: string) => void;
};

const SelectedFilesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { assets = [], onComplete } = (route.params || {}) as SelectedFilesRouteParams;

  const [caption, setCaption] = useState('');
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<any>(
    assets.length > 0 ? assets[0] : null,
  );
  const [selectedImages, setSelectedImages] = useState<any[]>(
    selectedImage ? [selectedImage] : [],
  );
  const [images, setImages] = useState<any[]>(
    (assets || []).map(img => ({
      ...img,
      // Normalise tiny base64 preview field if picker provided base64
      tinyBase64: img?.tinyBase64 || img?.base64 || null,
    })),
  );
  const [fileOptions, setFileOptions] = useState<Record<string, { scan: boolean; compress: boolean }>>({});
  const [isSending, setIsSending] = useState(false);

  // Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      navigation.goBack();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );

    return () => subscription.remove();
  }, [navigation]);

  // Initialize captions + options from incoming assets
  useEffect(() => {
    try {
      const initialCaptions = (assets || []).reduce(
        (acc: Record<string, string>, img: any) => {
          const key = img?.uri;
          if (key) acc[key] = img?.ukti || '';
          return acc;
        },
        {},
      );
      setCaptions(initialCaptions);
      if (selectedImage?.uri) {
        setCaption(initialCaptions[selectedImage.uri] || '');
      }

      const initialOptions = (assets || []).reduce(
        (acc: Record<string, { scan: boolean; compress: boolean }>, img: any) => {
          const key = img?.uri;
          if (key) {
            acc[key] = {
              scan: !!img?.scan,
              compress: !!img?.compress,
            };
          }
          return acc;
        },
        {},
      );
      setFileOptions(initialOptions);
      setImages(prev =>
        (prev || []).map(img => {
          const key = img?.uri;
          if (!key) return img;
          const opt = initialOptions[key] || { scan: false, compress: false };
          return {
            ...img,
            scan: !!opt.scan,
            compress: !!opt.compress,
            tinyBase64: img?.tinyBase64 || img?.base64 || null,
          };
        }),
      );
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageSelect = (image: any) => {
    setSelectedImage(image);
    setSelectedImages([image]);

    if (image?.uri) {
      setCaption(captions[image.uri] || '');
    } else {
      setCaption('');
    }

    if (image?.uri && !fileOptions[image.uri]) {
      setFileOptions(prev => ({
        ...prev,
        [image.uri]: { scan: false, compress: false },
      }));
    }
  };

  const handleDelete = () => {
    const updatedImages = images?.filter(
      image => !selectedImages?.includes(image),
    );
    setImages(updatedImages);

    // Remove captions and options for deleted images
    setCaptions(prev => {
      const next = { ...prev };
      (selectedImages || []).forEach(img => {
        if (img?.uri && next[img.uri] !== undefined) {
          delete next[img.uri];
        }
      });
      return next;
    });

    setFileOptions(prev => {
      const next = { ...prev };
      (selectedImages || []).forEach(img => {
        if (img?.uri && next[img.uri] !== undefined) {
          delete next[img.uri];
        }
      });
      return next;
    });

    if (updatedImages.length === 0) {
      navigation.goBack();
    } else if (
      selectedImages?.includes(selectedImage) &&
      updatedImages.length > 0
    ) {
      const nextSelection = updatedImages[0];
      setSelectedImage(nextSelection);
      setCaption(captions[nextSelection?.uri] || '');
      setSelectedImages([nextSelection]);
    } else if (!selectedImages?.length && updatedImages.length > 0) {
      const nextSelection = updatedImages[0];
      setSelectedImage(nextSelection);
      setCaption(captions[nextSelection?.uri] || '');
      setSelectedImages([nextSelection]);
    } else {
      setSelectedImages(prev =>
        prev.filter(img => updatedImages.some(u => u.uri === img.uri)),
      );
    }
  };

  const handleCrop = async () => {
    const updatedImages = [...images];

    for (const image of selectedImages) {
      if (image.type?.startsWith('image/')) {
        const croppedImage = await ImageCropPicker.openCropper({
          path: image.uri,
          width: image.width || 1200,
          height: image.height || 1200,
          cropperToolbarTitle: 'Edit',
          cropperCircleOverlay: false,
          freeStyleCropEnabled: true,
          mediaType: 'photo',
          hideBottomControls: true,
          enableRotationGesture: true,
          showCropGuidelines: true,
          // Also return tiny base64 preview for cropped image
          includeBase64: true,
        });

        const existingOptions = fileOptions[image.uri] || {
          scan: false,
          compress: false,
        };
        const updatedImage = {
          uri: croppedImage.path,
          width: croppedImage.width,
          height: croppedImage.height,
          type: image.type,
          scan: !!existingOptions.scan,
          compress: !!existingOptions.compress,
          tinyBase64: croppedImage.data || image.tinyBase64 || null,
        };

        setSelectedImages(prevImages =>
          prevImages.map(img => (img.uri === image.uri ? updatedImage : img)),
        );

        const imageIndex = updatedImages.findIndex(
          img => img.uri === image.uri,
        );
        if (imageIndex !== -1) {
          updatedImages[imageIndex] = updatedImage;
        }

        setFileOptions(prev => {
          const next = { ...prev };
          delete next[image.uri];
          next[croppedImage.path] = existingOptions;
          return next;
        });
      }
    }

    setImages(updatedImages);
    setSelectedImage(
      updatedImages.find(img =>
        selectedImages.some(sel => sel.uri === img.uri),
      ) || updatedImages[0],
    );

    // Carry forward captions
    setCaptions(prev => {
      const next = { ...prev };
      (selectedImages || []).forEach(oldImg => {
        const oldKey = oldImg?.uri;
        const newImg = updatedImages.find(
          i => i.uri !== oldKey && i.type === oldImg.type,
        );
        if (oldKey && newImg?.uri && next[oldKey] !== undefined && next[newImg.uri] === undefined) {
          next[newImg.uri] = next[oldKey] || '';
          delete next[oldKey];
        }
      });
      return next;
    });
  };

  const persistOptionOnAssets = (uri: string | undefined, key: 'scan' | 'compress', value: boolean) => {
    if (!uri) return;

    setImages(prev =>
      (prev || []).map(img =>
        img?.uri === uri ? { ...img, [key]: value } : img,
      ),
    );
    setSelectedImages(prev =>
      (prev || []).map(img =>
        img?.uri === uri ? { ...img, [key]: value } : img,
      ),
    );
    setSelectedImage(prev =>
      prev?.uri === uri ? { ...prev, [key]: value } : prev,
    );
  };

  const toggleFileOption = (uri: string | undefined, key: 'scan' | 'compress') => {
    if (!uri) return;
    setFileOptions(prev => {
      const current = prev[uri] || { scan: false, compress: false };
      const updatedValue = !current[key];
      const updatedForUri = { ...current, [key]: updatedValue };

      persistOptionOnAssets(uri, key, updatedValue);

      return {
        ...prev,
        [uri]: updatedForUri,
      };
    });
  };

  const handleSend = () => {
    if (isSending) return;
    setIsSending(true);

    const imagesWithCaptions = (images || []).map(img => {
      const options = img?.uri
        ? fileOptions[img.uri] || {
            scan: !!img?.scan,
            compress: !!img?.compress,
          }
        : { scan: false, compress: false };
      return {
        ...img,
        ukti: captions[img?.uri] || '',
        scan: !!options.scan,
        compress: !!options.compress,
        tinyBase64: img?.tinyBase64 || img?.base64 || null,
      };
    });
    // If a callback was provided, pass data back to previous screen
    if (onComplete) {
      onComplete(imagesWithCaptions, caption);
    }

    navigation.goBack();
  };

  const Checkbox = ({
    checked,
    onPress,
    label,
  }: {
    checked: boolean;
    onPress: () => void;
    label: string;
  }) => (
    <TouchableOpacity
      accessible
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.checkboxRowItem}>
      <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
        {checked && <Text style={styles.checkboxMark}>✓</Text>}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerIcon}>✖</Text>
        </TouchableOpacity>

        <View style={styles.headerIconsRight}>
          {selectedImages?.length > 0 && (
            <>
              <TouchableOpacity
                onPress={handleCrop}
                style={styles.cropButton}>
                <Icon name="crop" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Main Image */}
      <View style={styles.imageContainer}>
        {selectedImage ? (
          <Image
            source={{ uri: selectedImage.uri }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ color: '#fff' }}>No image selected</Text>
        )}
      </View>

      {/* Thumbnails + delete */}
      <View style={styles.thumbnailSection}>
        {selectedImages.length > 0 && (
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteButton}>
            <Icon name="delete" size={30} color="#fff" />
          </TouchableOpacity>
        )}

        <ScrollView horizontal style={styles.thumbnailContainer}>
          {images?.map((image, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleImageSelect(image)}
              style={[
                styles.thumbnailWrapper,
                selectedImage === image && styles.selectedThumbnail,
              ]}>
              <Image
                source={{ uri: image.uri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              {selectedImage === image && (
                <Icon
                  name="check-circle"
                  size={20}
                  color="#00cc00"
                  style={styles.checkmark}
                />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Scan / Compress */}
      <View style={styles.checkboxRow}>
        {selectedImage?.uri ? (
          <>
            <Checkbox
              checked={!!fileOptions[selectedImage.uri]?.scan}
              onPress={() => toggleFileOption(selectedImage.uri, 'scan')}
              label="Scan"
            />
            <Checkbox
              checked={!!fileOptions[selectedImage.uri]?.compress}
              onPress={() =>
                toggleFileOption(selectedImage.uri, 'compress')
              }
              label="Compress"
            />
          </>
        ) : (
          <Text style={{ color: '#aaa', paddingHorizontal: 10 }}>
            Select a file to enable options
          </Text>
        )}
      </View>

      {/* Caption + Send */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Add a caption..."
            placeholderTextColor="#888"
            value={caption}
            onChangeText={text => {
              setCaption(text);
              if (selectedImage?.uri) {
                setCaptions(prev => ({
                  ...prev,
                  [selectedImage.uri]: text,
                }));
              }
            }}
          />
          <TouchableOpacity onPress={handleSend} disabled={isSending}>
            <LinearGradient
              style={[
                styles.sendButton,
                isSending && styles.disabledButton,
              ]}
              colors={['#6462AC', '#028BD3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}>
              <Ionicons name="send" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  headerIcon: {
    fontSize: 20,
    color: '#fff',
    marginHorizontal: 10,
  },
  headerIconsRight: {
    flexDirection: 'row',
  },
  cropButton: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  thumbnailSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
  },
  deleteButton: {
    paddingHorizontal: 10,
  },
  thumbnailContainer: {
    flex: 1,
  },
  thumbnailWrapper: {
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 5,
    position: 'relative',
  },
  selectedThumbnail: {
    borderColor: '#00cc00',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 5,
  },
  checkmark: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#0f0f0f',
  },
  checkboxRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxBoxChecked: {
    backgroundColor: '#028BD3',
    borderColor: '#028BD3',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  inputContainer: {
    padding: 10,
    backgroundColor: '#1a1a1a',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#0080ff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default SelectedFilesScreen;

