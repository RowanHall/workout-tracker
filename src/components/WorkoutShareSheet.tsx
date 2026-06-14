import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Camera, ImagePlus, Layers, Share2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import {
  ShareableWorkoutCard,
  type ShareBackground,
  type ShareStats,
} from '@/components/ShareableWorkoutCard';

interface Props {
  visible: boolean;
  stats: ShareStats | null;
  onClose: () => void;
}

type BackgroundMode = 'transparent' | 'photo';

/**
 * Turns a workout into a shareable image. "Transparent" exports a PNG with real
 * alpha — a sticker to layer over an Instagram Story like Strava. Adding a photo
 * bakes the stats in so the whole thing can be sent through the native share
 * sheet (Messages, WhatsApp, …).
 */
export function WorkoutShareSheet({ visible, stats, onClose }: Props) {
  const cardRef = useRef<View>(null);
  const [mode, setMode] = useState<BackgroundMode>('transparent');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // A chosen photo must finish decoding before capture, or it snapshots blank.
  const [imageReady, setImageReady] = useState(true);
  const [busy, setBusy] = useState(false);

  const background: ShareBackground =
    mode === 'photo' && photoUri ? { type: 'photo', uri: photoUri } : { type: 'transparent' };

  function reset() {
    setMode('transparent');
    setPhotoUri(null);
    setImageReady(true);
    setBusy(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function applyPhoto(uri: string) {
    setImageReady(false);
    setPhotoUri(uri);
    setMode('photo');
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos access needed', 'Allow photo access to add a background.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });
    const uri = result.assets?.[0]?.uri;
    if (!result.canceled && uri) applyPhoto(uri);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access to snap a background.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85,
    });
    const uri = result.assets?.[0]?.uri;
    if (!result.canceled && uri) applyPhoto(uri);
  }

  async function handleShare() {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
        return;
      }
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080,
        height: 1920,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Share your workout',
      });
    } catch (err: any) {
      Alert.alert('Could not share', err?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (!stats) return null;

  // Size the preview to fit the screen while holding the 9:16 export ratio.
  const { width, height } = Dimensions.get('window');
  const cardWidth = Math.min(width - 48, ((height - 360) * 9) / 16);

  const shareDisabled = busy || (mode === 'photo' && !imageReady);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-lg font-bold text-white">Share Workout</Text>
          <Pressable onPress={handleClose} hitSlop={8} className="active:opacity-70">
            <X size={24} color="#8B98A9" />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <View style={{ width: cardWidth }}>
            <ShareableWorkoutCard
              ref={cardRef}
              stats={stats}
              background={background}
              onImageLoad={() => setImageReady(true)}
            />
          </View>
          <Text className="mt-4 px-4 text-center text-xs text-muted">
            {mode === 'transparent'
              ? 'Transparent — add it over your Instagram Story so your photo shows through.'
              : 'Your photo with stats baked in — perfect for Messages & WhatsApp.'}
          </Text>
        </View>

        <View className="px-4 pb-2">
          <View className="mb-3 flex-row gap-2">
            <BackgroundOption
              label="Transparent"
              icon={<Layers size={18} color={mode === 'transparent' ? '#0B0F14' : '#FFFFFF'} />}
              active={mode === 'transparent'}
              onPress={() => setMode('transparent')}
            />
            <BackgroundOption
              label="Photo"
              icon={<ImagePlus size={18} color={mode === 'photo' ? '#0B0F14' : '#FFFFFF'} />}
              active={mode === 'photo'}
              onPress={pickFromLibrary}
            />
            <BackgroundOption
              label="Camera"
              icon={<Camera size={18} color="#FFFFFF" />}
              active={false}
              onPress={takePhoto}
            />
          </View>

          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4 active:opacity-80 disabled:opacity-50"
            disabled={shareDisabled}
            onPress={handleShare}
          >
            {busy ? (
              <ActivityIndicator color="#0B0F14" />
            ) : (
              <>
                <Share2 size={20} color="#0B0F14" strokeWidth={2.25} />
                <Text className="text-base font-bold text-background">Share</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function BackgroundOption({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 active:opacity-80 ${
        active ? 'bg-primary' : 'border border-border bg-surface-2'
      }`}
    >
      {icon}
      <Text className={`text-sm font-semibold ${active ? 'text-background' : 'text-white'}`}>
        {label}
      </Text>
    </Pressable>
  );
}
