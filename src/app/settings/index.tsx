import { router } from 'expo-router';
import {
  AtSign,
  Bell,
  ChevronRight,
  Crown,
  Download,
  FileText,
  Globe,
  Scale,
  Shield,
  User,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BodyWeightEditorSheet } from '@/components/BodyWeightEditorSheet';
import { KovaLogo } from '@/components/KovaLogo';
import { ProBadge } from '@/components/ProBadge';
import { useHeaderInset } from '@/lib/blurHeader';
import { formatWeight } from '@/lib/format';
import { exportWorkoutsCsv } from '@/lib/export';
import { LOCALES } from '@/lib/i18n';
import { hasPermission } from '@/lib/notifications';
import { DEFAULT_SETTINGS, loadSettings } from '@/lib/notificationSettings';
import { supabase } from '@/lib/supabase';
import type { BodyWeight } from '@/lib/types';
import { useAuth } from '@/providers/AuthProvider';
import { useLanguage } from '@/providers/LanguageProvider';
import { usePremium } from '@/providers/PremiumProvider';

export default function SettingsHubScreen() {
  const { session, profile } = useAuth();
  const userId = session?.user.id;
  const { isPremium } = usePremium();
  const { t, locale } = useLanguage();
  const headerInset = useHeaderInset();
  const currentLanguage = LOCALES.find((l) => l.code === locale)?.name ?? 'English';

  const displayName = profile?.display_name ?? profile?.username ?? '';

  const [latestWeight, setLatestWeight] = useState<BodyWeight['weight'] | null>(null);
  const [editingWeight, setEditingWeight] = useState(false);
  const [notifsOn, setNotifsOn] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const [weightRes, prefs, perm] = await Promise.all([
      supabase
        .from('body_weights')
        .select('weight')
        .eq('user_id', userId)
        .order('recorded_on', { ascending: false })
        .limit(1)
        .maybeSingle(),
      loadSettings(),
      hasPermission(),
    ]);
    setLatestWeight(weightRes.data ? Number(weightRes.data.weight) : null);
    setNotifsOn((prefs ?? DEFAULT_SETTINGS).enabled && perm);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleExport() {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    if (!userId) return;
    setExporting(true);
    try {
      await exportWorkoutsCsv(userId);
    } catch (err: any) {
      Alert.alert(t('settings.export.failedTitle'), err?.message ?? t('settings.export.failedFallback'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: headerInset, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {!isPremium && (
        <Pressable
          onPress={() => router.push('/paywall')}
          className="mx-5 mt-4 flex-row items-center justify-between rounded-2xl bg-surface px-4 py-3 active:opacity-80"
        >
          <View className="flex-row items-baseline">
            <KovaLogo size={18} style={{ color: '#FFFFFF' }} />
            <Text
              className="ml-2"
              style={{
                fontSize: 18,
                fontWeight: '700',
                letterSpacing: 1.5,
                color: '#F59E0B',
                textTransform: 'uppercase',
              }}
            >
              Pro
            </Text>
          </View>
          <View className="rounded-full bg-primary px-4 py-2">
            <Text className="text-[13px] font-bold text-background">{t('common.unlock')}</Text>
          </View>
        </Pressable>
      )}

      <Pressable
        className="items-center px-5 pt-6 pb-4 active:opacity-80"
        onPress={() => router.push('/settings/profile')}
      >
        <Avatar url={profile?.avatar_url} name={displayName} size={88} />
        <Text
          className="mt-4 text-[22px] font-bold text-white"
          style={{ letterSpacing: -0.3 }}
        >
          {displayName}
        </Text>
        {profile?.username && (
          <Text className="mt-0.5 text-sm text-muted">@{profile.username}</Text>
        )}
      </Pressable>

      <Section label={t('settings.section.account')}>
        <MenuRow
          icon={<User size={18} color="#8B98A9" strokeWidth={1.75} />}
          label={t('settings.row.profile')}
          onPress={() => router.push('/settings/profile')}
        />
        <MenuRow
          icon={<AtSign size={18} color="#8B98A9" strokeWidth={1.75} />}
          label={t('settings.row.account')}
          trailing={
            <Text className="text-[13px] text-muted" numberOfLines={1}>
              {session?.user.email ?? ''}
            </Text>
          }
          onPress={() => router.push('/settings/account')}
        />
        <MenuRow
          icon={<Crown size={18} color="#8B98A9" strokeWidth={1.75} />}
          label={t('settings.row.membership')}
          trailing={isPremium ? <ProBadge /> : <Text className="text-[13px] text-muted">{t('common.free')}</Text>}
          onPress={() => router.push('/settings/membership')}
          last
        />
      </Section>

      <Section label={t('settings.section.preferences')}>
        <MenuRow
          icon={<Bell size={18} color="#8B98A9" strokeWidth={1.75} />}
          label={t('settings.row.notifications')}
          trailing={
            <Text className="text-[13px] text-muted">{notifsOn ? t('common.on') : t('common.off')}</Text>
          }
          onPress={() => router.push('/settings/notifications')}
        />
        <MenuRow
          icon={<Globe size={18} color="#8B98A9" strokeWidth={1.75} />}
          label={t('settings.row.language')}
          trailing={<Text className="text-[13px] text-muted">{currentLanguage}</Text>}
          onPress={() => router.push('/settings/language')}
        />
        <MenuRow
          icon={<Scale size={18} color="#8B98A9" strokeWidth={1.75} />}
          label={t('settings.row.bodyWeight')}
          trailing={
            latestWeight != null ? (
              <Text
                className="text-[13px] text-muted"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatWeight(latestWeight)} lbs
              </Text>
            ) : (
              <Text className="text-[13px] text-muted">{t('common.notSet')}</Text>
            )
          }
          onPress={() => setEditingWeight(true)}
          last
        />
      </Section>

      <Section label={t('settings.section.data')}>
        <MenuRow
          icon={<Download size={18} color="#8B98A9" strokeWidth={1.75} />}
          label={exporting ? t('settings.row.exportPreparing') : t('settings.row.export')}
          trailing={!isPremium ? <ProBadge /> : undefined}
          onPress={handleExport}
          last
        />
      </Section>

      <Section label="Safety & Legal">
        <MenuRow
          icon={<Shield size={18} color="#8B98A9" strokeWidth={1.75} />}
          label="Blocked accounts"
          onPress={() => router.push('/settings/blocked')}
        />
        <MenuRow
          icon={<FileText size={18} color="#8B98A9" strokeWidth={1.75} />}
          label="Terms of Use"
          onPress={() => Linking.openURL('https://kovafit.ca/terms/')}
          last
        />
      </Section>

      <BodyWeightEditorSheet
        visible={editingWeight}
        onClose={() => setEditingWeight(false)}
        userId={userId}
        latestLbs={latestWeight}
        onSaved={load}
      />
    </ScrollView>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="px-5 pt-7">
      <Text className="mb-3 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

function MenuRow({
  icon,
  label,
  trailing,
  onPress,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center py-3.5 active:opacity-70 ${
        last ? '' : 'border-b border-white/5'
      }`}
    >
      <View className="w-7">{icon}</View>
      <Text className="flex-1 text-[15px] text-white">{label}</Text>
      {trailing && <View className="mr-2 max-w-[60%]">{trailing}</View>}
      <ChevronRight size={18} color="#8B98A9" strokeWidth={2} />
    </Pressable>
  );
}
