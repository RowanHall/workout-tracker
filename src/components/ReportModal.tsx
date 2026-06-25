import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';

export type ReportReason = 'spam' | 'harassment' | 'nudity' | 'violence' | 'hate' | 'other';

interface ReportOption {
  value: ReportReason;
  label: string;
  description: string;
}

const REASONS: ReportOption[] = [
  { value: 'spam', label: 'Spam', description: 'Repetitive, off-topic, or promotional' },
  { value: 'harassment', label: 'Harassment or bullying', description: 'Targeting someone' },
  { value: 'nudity', label: 'Nudity or sexual content', description: 'Adult or explicit imagery' },
  { value: 'violence', label: 'Violence or self-harm', description: 'Graphic or dangerous' },
  { value: 'hate', label: 'Hate speech', description: 'Slurs or attacks on a group' },
  { value: 'other', label: 'Something else', description: 'Tell us what went wrong' },
];

interface ReportModalProps {
  visible: boolean;
  workoutId: string | null;
  reporterId: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function ReportModal({
  visible,
  workoutId,
  reporterId,
  onClose,
  onSubmitted,
}: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setReason(null);
    setDetails('');
    setSubmitting(false);
  }

  async function handleSubmit() {
    if (!reason || !workoutId || !reporterId || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from('workout_reports').insert({
      workout_id: workoutId,
      reporter_id: reporterId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error && !/duplicate key/i.test(error.message)) {
      Alert.alert('Could not send report', error.message);
      return;
    }
    Alert.alert(
      'Report sent',
      'Thanks — we review reports within 24 hours and act on violations.',
    );
    reset();
    onSubmitted?.();
    onClose();
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/60 pt-16">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 rounded-t-[28px] bg-surface pt-3">
            <View className="mb-1 h-1 w-10 self-center rounded-full bg-border" />

            <View className="flex-row items-center justify-between px-6 pb-4 pt-3">
              <Text className="text-[18px] font-bold text-white">Report workout</Text>
              <Pressable onPress={handleClose} hitSlop={10} className="active:opacity-70">
                <X size={20} color="#8B98A9" strokeWidth={2.25} />
              </Pressable>
            </View>

            <ScrollView
              className="flex-1 px-6"
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text className="mb-5 text-[14px] leading-[20px] text-muted">
                Kova has zero tolerance for objectionable content or abusive behavior. We
                review reports within 24 hours.
              </Text>

              <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
                Reason
              </Text>
              {REASONS.map((option, i) => (
                <ReasonRow
                  key={option.value}
                  option={option}
                  selected={reason === option.value}
                  onSelect={() => setReason(option.value)}
                  last={i === REASONS.length - 1}
                />
              ))}

              <Text className="mb-2.5 mt-7 text-[11px] font-bold uppercase tracking-[2.5px] text-muted">
                Details (optional)
              </Text>
              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Anything else we should know?"
                placeholderTextColor="rgba(139,152,169,0.7)"
                className="min-h-[88px] rounded-2xl bg-surface-2 px-4 py-3 text-[15px] text-white"
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </ScrollView>

            <View
              className="flex-row gap-2.5 border-t border-white/5 px-6 pt-3"
              style={{ paddingBottom: Platform.OS === 'ios' ? 32 : 20 }}
            >
              <Pressable
                onPress={handleClose}
                disabled={submitting}
                className="flex-1 items-center justify-center rounded-full border border-white/15 py-4 active:opacity-70 disabled:opacity-50"
              >
                <Text className="font-semibold text-white">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={!reason || submitting}
                className="flex-row items-center justify-center gap-2 rounded-full bg-danger py-4 active:opacity-80 disabled:opacity-50"
                style={{ flex: 1.4 }}
              >
                {submitting && <ActivityIndicator color="#FFFFFF" size="small" />}
                <Text className="font-bold text-white">
                  {submitting ? 'Sending' : 'Send report'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ReasonRow({
  option,
  selected,
  onSelect,
  last,
}: {
  option: ReportOption;
  selected: boolean;
  onSelect: () => void;
  last: boolean;
}) {
  return (
    <Pressable
      onPress={onSelect}
      className={`flex-row items-center py-3.5 active:opacity-70 ${
        last ? '' : 'border-b border-white/5'
      }`}
    >
      <View className="flex-1 pr-3">
        <Text
          className={`text-[15px] ${selected ? 'font-bold text-primary' : 'font-semibold text-white'}`}
        >
          {option.label}
        </Text>
        <Text className="mt-0.5 text-xs text-muted">{option.description}</Text>
      </View>
      <View
        className={`h-5 w-5 items-center justify-center rounded-full ${
          selected ? 'bg-primary' : 'border border-white/15'
        }`}
      >
        {selected && <Check size={12} color="#0B0F14" strokeWidth={3} />}
      </View>
    </Pressable>
  );
}
