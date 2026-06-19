import { Link as LinkIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { KovaLogo } from '@/components/KovaLogo';
import type { ShareStats } from '@/components/ShareableWorkoutCard';

interface Props {
  stats: ShareStats;
  url: string;
}

/**
 * Preview of what shows up in the recipient's chat: a blue iMessage-style
 * bubble with the message, followed by a rich link card. Not the actual
 * shared payload — purely visual context for the swipeable share sheet.
 */
export function LinkSharePreview({ stats, url }: Props) {
  const host = url.replace(/^https?:\/\//, '').split('/')[0];
  const summary = [
    `${Math.round(stats.volume).toLocaleString()} lbs`,
    stats.durationLabel,
    stats.sets ? `${stats.sets} sets` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="w-full max-w-[320px] self-center">
      <Text className="mb-3 text-center text-[10px] font-bold uppercase tracking-[3px] text-muted">
        Preview
      </Text>

      <View className="items-end gap-1.5">
        <View className="max-w-[260px] rounded-3xl rounded-br-md px-4 py-2.5" style={styles.bubble}>
          <Text className="text-base text-white">Check out my workout! 💪</Text>
        </View>

        <View
          className="max-w-[280px] overflow-hidden rounded-2xl border border-border bg-surface"
          style={styles.linkCard}
        >
          <View className="h-20 items-center justify-center bg-surface-2">
            <KovaLogo size={32} />
          </View>
          <View className="px-3.5 py-3">
            <Text className="text-sm font-bold text-white" numberOfLines={2}>
              {stats.title}
            </Text>
            {!!summary && (
              <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
                {stats.athleteName ? `${stats.athleteName} · ` : ''}
                {summary}
              </Text>
            )}
            <View className="mt-2 flex-row items-center gap-1.5">
              <LinkIcon size={11} color="#8B98A9" strokeWidth={2.25} />
              <Text className="text-[11px] text-muted" numberOfLines={1}>
                {host}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: '#2C7AFE',
  },
  linkCard: {
    width: 280,
  },
});
