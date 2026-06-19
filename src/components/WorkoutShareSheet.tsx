import * as Sharing from 'expo-sharing';
import { Share2, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { LinkSharePreview } from '@/components/LinkSharePreview';
import { ShareableWorkoutCard, type ShareStats } from '@/components/ShareableWorkoutCard';

interface Props {
  visible: boolean;
  stats: ShareStats | null;
  onClose: () => void;
}

// TODO: swap to the real share host once it's hosted (GitHub Pages stub or
// proper landing page). The path mirrors what a /w/<id> deep-link handler
// will eventually consume.
const SHARE_URL_BASE = 'https://kova.app/w';

type PageIndex = 0 | 1;

/**
 * Strava-style swipeable share sheet. Page 1 sends a link that opens the
 * workout in the app (anywhere — Messages, WhatsApp, …). Page 2 captures a
 * translucent PNG sticker for Instagram Stories.
 */
export function WorkoutShareSheet({ visible, stats, onClose }: Props) {
  const stickerRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState<PageIndex>(0);
  const [busy, setBusy] = useState(false);

  const { width: screenWidth } = Dimensions.get('window');
  const pageWidth = screenWidth;
  // Sticker holds its 9:16 aspect; leave room for header/footer chrome.
  const stickerWidth = Math.min(pageWidth - 96, 260);

  function handleClose() {
    setBusy(false);
    setPage(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    onClose();
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth) as PageIndex;
    if (next !== page) setPage(next);
  }

  function goToPage(p: PageIndex) {
    scrollRef.current?.scrollTo({ x: p * pageWidth, animated: true });
    setPage(p);
  }

  async function shareLink(url: string) {
    if (busy) return;
    setBusy(true);
    try {
      await Share.share(
        {
          message: `Check out my workout! ${url}`,
          url,
        },
        { dialogTitle: 'Share workout' }
      );
    } catch (err: any) {
      Alert.alert('Could not share', err?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function shareSticker() {
    if (!stickerRef.current || busy) return;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
        return;
      }
      const uri = await captureRef(stickerRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080,
        height: 1920,
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Share to Instagram Story',
      });
    } catch (err: any) {
      Alert.alert('Could not share', err?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (!stats) return null;

  const shareUrl = `${SHARE_URL_BASE}/${stats.workoutId}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-lg font-bold text-white">Share Workout</Text>
            <Pressable onPress={handleClose} hitSlop={8} className="active:opacity-70">
              <X size={24} color="#8B98A9" />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            className="flex-1"
          >
            <View
              style={{ width: pageWidth }}
              className="items-center justify-center px-6"
            >
              <LinkSharePreview stats={stats} url={shareUrl} />
            </View>

            <View
              style={{ width: pageWidth }}
              className="items-center justify-center px-6"
            >
              <View style={{ width: stickerWidth }}>
                <ShareableWorkoutCard
                  ref={stickerRef}
                  stats={stats}
                  background={{ type: 'transparent' }}
                />
              </View>
            </View>
          </ScrollView>

          <View className="px-4 pb-2">
            <View className="mb-3 flex-row justify-center gap-2">
              <Dot active={page === 0} onPress={() => goToPage(0)} />
              <Dot active={page === 1} onPress={() => goToPage(1)} />
            </View>
            <Text className="mb-3 text-center text-xs text-muted">
              {page === 0
                ? 'Send a link — opens your workout in Kova. Works in Messages, WhatsApp, anywhere.'
                : 'Translucent sticker — drop it over your Instagram Story.'}
            </Text>
            <Pressable
              className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-4 active:opacity-80 disabled:opacity-50"
              disabled={busy}
              onPress={page === 0 ? () => shareLink(shareUrl) : shareSticker}
            >
              {busy ? (
                <ActivityIndicator color="#0B0F14" />
              ) : (
                <>
                  <Share2 size={20} color="#0B0F14" strokeWidth={2.25} />
                  <Text className="text-base font-bold text-background">
                    {page === 0 ? 'Send link' : 'Share to Story'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function Dot({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <View
        className={`h-2 rounded-full ${active ? 'w-6 bg-primary' : 'w-2 bg-surface-2'}`}
      />
    </Pressable>
  );
}
