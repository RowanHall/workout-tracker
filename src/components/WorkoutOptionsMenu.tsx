import { Flag, MoreHorizontal, UserX } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';

import { ReportModal } from '@/components/ReportModal';
import { supabase } from '@/lib/supabase';

interface WorkoutOptionsMenuProps {
  workoutId: string;
  workoutOwnerId: string;
  workoutOwnerUsername: string;
  currentUserId: string | null;
  onBlocked?: () => void;
  /** Color override for the dots icon. */
  iconColor?: string;
}

export function WorkoutOptionsMenu({
  workoutId,
  workoutOwnerId,
  workoutOwnerUsername,
  currentUserId,
  onBlocked,
  iconColor = '#8B98A9',
}: WorkoutOptionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const isOwn = !!currentUserId && currentUserId === workoutOwnerId;
  if (!currentUserId) return null;

  function handleReport() {
    setMenuOpen(false);
    setTimeout(() => setReportOpen(true), 150);
  }

  function handleBlock() {
    setMenuOpen(false);
    Alert.alert(
      `Block @${workoutOwnerUsername}?`,
      "They won't be able to see your workouts or comment on them, and you won't see theirs. You can unblock from Settings later.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('user_blocks')
              .insert({ blocker_id: currentUserId, blocked_id: workoutOwnerId });
            if (error && !/duplicate key/i.test(error.message)) {
              Alert.alert('Could not block', error.message);
              return;
            }
            onBlocked?.();
          },
        },
      ],
    );
  }

  return (
    <>
      <Pressable
        hitSlop={10}
        className="active:opacity-70"
        onPress={() => setMenuOpen(true)}
      >
        <MoreHorizontal size={20} color={iconColor} strokeWidth={2} />
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/60"
          onPress={() => setMenuOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-3xl bg-surface px-2 pb-10 pt-3"
          >
            <View className="mb-2 h-1 w-10 self-center rounded-full bg-border" />
            <MenuRow
              icon={<Flag size={18} color="#EF4444" strokeWidth={2} />}
              label="Report workout"
              description="Spam, abuse, or other objectionable content"
              onPress={handleReport}
            />
            {!isOwn && (
              <MenuRow
                icon={<UserX size={18} color="#EF4444" strokeWidth={2} />}
                label={`Block @${workoutOwnerUsername}`}
                description="Hide their workouts and stop interactions"
                onPress={handleBlock}
                danger
                last
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ReportModal
        visible={reportOpen}
        workoutId={workoutId}
        reporterId={currentUserId}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}

function MenuRow({
  icon,
  label,
  description,
  onPress,
  danger,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl px-4 py-3.5 active:bg-surface-2 ${
        last ? '' : ''
      }`}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-2">
        {icon}
      </View>
      <View className="flex-1">
        <Text className={`text-[15px] font-semibold ${danger ? 'text-danger' : 'text-white'}`}>
          {label}
        </Text>
        {description && (
          <Text className="mt-0.5 text-xs text-muted" numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
