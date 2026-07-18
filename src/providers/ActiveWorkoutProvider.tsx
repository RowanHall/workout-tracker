import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useAuth } from '@/providers/AuthProvider';

type ActiveWorkoutContextValue = ReturnType<typeof useActiveWorkout> & {
  /** Whether the active-workout sheet is pulled up to full screen. */
  expanded: boolean;
  /** Pull the workout sheet up over the current screen. */
  expand: () => void;
  /** Drop the workout sheet back down to the floating pill. */
  collapse: () => void;
};

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(null);

/**
 * Hoists the in-progress workout into a single app-wide instance so the
 * launcher tab, the tab bar, the floating "resume workout" pill, and the
 * global pull-up sheet all read and mutate the same state.
 *
 * Also owns whether that sheet is pulled up (`expanded`) or dropped to the pill
 * (`collapsed`). Starting a workout pulls the sheet up automatically; finishing
 * or discarding drops it away.
 */
export function ActiveWorkoutProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const value = useActiveWorkout(session?.user.id);
  const [expanded, setExpanded] = useState(false);

  const workoutId = value.workout?.id ?? null;
  const prevWorkoutId = useRef<string | null>(null);
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      // First sync after mount. If a workout was resumed from a previous
      // session, leave the sheet collapsed (show the pill) rather than taking
      // over the screen on launch.
      initialized.current = true;
      prevWorkoutId.current = workoutId;
      return;
    }
    // A workout just started (null -> id) — pull the sheet up. When it clears
    // (finish / discard), drop back to the pill.
    if (workoutId && workoutId !== prevWorkoutId.current) {
      setExpanded(true);
    } else if (!workoutId) {
      setExpanded(false);
    }
    prevWorkoutId.current = workoutId;
  }, [workoutId]);

  const ctx = useMemo<ActiveWorkoutContextValue>(
    () => ({
      ...value,
      expanded,
      expand: () => setExpanded(true),
      collapse: () => setExpanded(false),
    }),
    [value, expanded]
  );

  return (
    <ActiveWorkoutContext.Provider value={ctx}>
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkoutContext() {
  const ctx = useContext(ActiveWorkoutContext);
  if (!ctx) {
    throw new Error('useActiveWorkoutContext must be used within an ActiveWorkoutProvider');
  }
  return ctx;
}
