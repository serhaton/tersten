import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { isRunningInExpoGo } from 'expo';

// Your real AdMob ad unit IDs go here (AdMob console > Apps > Ad units).
// Debug builds always use Google's test ads, so you never click your own real ads.
const AD_UNITS = {
  banner: Platform.select({ ios: 'ca-app-pub-4475107857161348/5488945951', default: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx' }),
  interstitial: Platform.select({ ios: 'ca-app-pub-4475107857161348/6362421808', default: 'ca-app-pub-xxxxxxxxxxxxxxxx/xxxxxxxxxx' }),
};

/** A full-screen ad after every this many finished rounds. */
const ROUNDS_PER_INTERSTITIAL = 2;

// Expo Go has no AdMob native code, so ads stay off there instead of crashing.
const Ads: typeof import('react-native-google-mobile-ads') | null = isRunningInExpoGo()
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- must not load in Expo Go
  : require('react-native-google-mobile-ads');

const unit = (key: keyof typeof AD_UNITS) => {
  if (!Ads) return null;
  if (__DEV__) return key === 'banner' ? Ads.TestIds.BANNER : Ads.TestIds.INTERSTITIAL;
  const id = AD_UNITS[key];
  return id.includes('xxxx') ? null : id; // not filled in yet: no ads in release builds
};

type AdsApi = {
  enabled: boolean;
  /** Call once when a round ends (the answer is revealed). */
  roundFinished: () => void;
  /** Call before starting a new round; shows the full-screen ad when one is due. */
  beforeNextRound: () => void;
};

const AdsContext = createContext<AdsApi>({ enabled: false, roundFinished: () => {}, beforeNextRound: () => {} });

const noInterstitial = () => ({ status: 'idle' as const, show: () => {}, load: () => {} });
const useInterstitial = Ads ? Ads.useInterstitialAd : noInterstitial;

export function AdsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const rounds = useRef(0);
  const due = useRef(false);

  useEffect(() => {
    if (!Ads) return;
    const ads = Ads;
    (async () => {
      // Shows Google's consent form where the law requires it (EEA, UK); a no-op elsewhere.
      let canRequest = true;
      try {
        const info = await ads.AdsConsent.gatherConsent();
        canRequest = info.canRequestAds;
      } catch {}
      if (!canRequest) return;
      await ads.default().initialize();
      setReady(true);
    })().catch(() => {});
  }, []);

  const interstitial = useInterstitial({ adUnitId: unit('interstitial'), autoLoad: ready });
  const { status, load, show } = interstitial;

  // Get the next one ready as soon as the last one is dismissed.
  useEffect(() => {
    if (status === 'closed') load();
  }, [status, load]);

  const api = useMemo<AdsApi>(() => ({
    enabled: ready,
    roundFinished: () => {
      rounds.current += 1;
      if (rounds.current % ROUNDS_PER_INTERSTITIAL === 0) due.current = true;
    },
    beforeNextRound: () => {
      if (!due.current || status !== 'loaded') return;
      due.current = false;
      show();
    },
  }), [ready, status, show]);

  return <AdsContext.Provider value={api}>{children}</AdsContext.Provider>;
}

export const useAds = () => useContext(AdsContext);

/** Banner pinned under the game screen. Renders nothing while ads are off. */
export function BannerSlot({ bottomInset }: { bottomInset: number }) {
  const { enabled } = useAds();
  const id = unit('banner');
  if (!Ads || !enabled || !id) return null;
  const { BannerAd, BannerAdSize } = Ads;
  return (
    <View style={[styles.banner, { paddingBottom: bottomInset }]}>
      {/* Fixed 320x50: the taller adaptive sizes would push the game cards off screen. */}
      <BannerAd unitId={id} size={BannerAdSize.BANNER} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
});
