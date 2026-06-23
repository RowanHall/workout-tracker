import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

import { supabase } from '@/lib/supabase';

/** The RevenueCat entitlement that unlocks Kova Pro. The id stays `premium`
 *  to match the existing RevenueCat dashboard configuration. */
const ENTITLEMENT_ID = 'premium';

// Native in-app purchases need a custom dev/standalone build; the module isn't
// present in Expo Go, so we never touch it there.
const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  default: undefined,
});

/** Whether purchases can actually run on this build (real build + key set). */
const PURCHASES_ENABLED = !IS_EXPO_GO && !!API_KEY;

interface PremiumContextValue {
  /** SDK has finished its first load (or is definitively unavailable). */
  ready: boolean;
  /** Purchases can be made here (false in Expo Go or when no key is set). */
  available: boolean;
  isPremium: boolean;
  offering: PurchasesOffering | null;
  /** Returns true if the purchase granted premium. Throws on real errors;
   *  a user cancellation surfaces as `error.userCancelled === true`. */
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
}

const PremiumContext = createContext<PremiumContextValue>({
  ready: false,
  available: false,
  isPremium: false,
  offering: null,
  purchase: async () => false,
  restore: async () => false,
});

function hasPremium(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

export function PremiumProvider({ children }: PropsWithChildren) {
  // When purchases are disabled we're "ready" immediately with no premium.
  const [ready, setReady] = useState(!PURCHASES_ENABLED);
  const [isPremium, setIsPremium] = useState(false);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  // Configure the SDK once and load the current entitlement + offering.
  useEffect(() => {
    if (!PURCHASES_ENABLED) return;
    let cancelled = false;

    (async () => {
      try {
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
        Purchases.configure({ apiKey: API_KEY! });

        const info = await Purchases.getCustomerInfo();
        if (!cancelled) setIsPremium(hasPremium(info));

        const offerings = await Purchases.getOfferings();
        if (!cancelled) setOffering(offerings.current ?? null);
      } catch {
        // Network/config hiccup — treat as non-premium; the user can retry.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const listener = (info: CustomerInfo) => setIsPremium(hasPremium(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  // Tie purchases to the Supabase user so entitlements follow the account
  // across devices and reinstalls.
  useEffect(() => {
    if (!PURCHASES_ENABLED) return;

    async function identify(userId: string | undefined) {
      try {
        if (userId) {
          const { customerInfo } = await Purchases.logIn(userId);
          setIsPremium(hasPremium(customerInfo));
        } else {
          await Purchases.logOut();
          setIsPremium(false);
        }
      } catch {
        // Ignore — entitlement state will refresh on the next app open.
      }
    }

    supabase.auth.getSession().then(({ data }) => identify(data.session?.user?.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      identify(session?.user?.id)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const ok = hasPremium(customerInfo);
    setIsPremium(ok);
    return ok;
  }, []);

  const restore = useCallback(async () => {
    const info = await Purchases.restorePurchases();
    const ok = hasPremium(info);
    setIsPremium(ok);
    return ok;
  }, []);

  return (
    <PremiumContext.Provider
      value={{ ready, available: PURCHASES_ENABLED, isPremium, offering, purchase, restore }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  return useContext(PremiumContext);
}
