import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export interface AdConfig {
  primaryDirectLink: string;
  fallbackDirectLink: string;
  adsterraApiToken: string;
  monetagDirectLink: string;
  monetagPopunderEnabled: boolean;
  monetagClickIntervalMs: number;
  enableLegitimateCheck: boolean;
  minClickIntervalMs: number;
  lastUpdated?: number;
}

const DEFAULT_CONFIG: AdConfig = {
  primaryDirectLink: "https://www.profitableratecpmnetwork.com/d192d2ap8?key=b61f2d758f64d7e7b4e6a422be46afd5",
  fallbackDirectLink: "https://www.profitablecpmrate.com/r79k8n0t?key=4e6a82fb8fefbfdafbdd3e88fae1f727",
  adsterraApiToken: "",
  monetagDirectLink: "https://uplcm.com/4/11976643",
  monetagPopunderEnabled: true,
  monetagClickIntervalMs: 1500,
  enableLegitimateCheck: true,
  minClickIntervalMs: 200,
};

export interface AdTriggerEvent {
  network: 'Adsterra' | 'Monetag';
  source: string;
  timestamp: number;
  url?: string;
  windowRef?: Window | null;
  isMobile?: boolean;
}

class AdService {
  private config: AdConfig = { ...DEFAULT_CONFIG };
  private lastTriggerTime: number = 0;
  private lastMonetagTriggerTime: number = 0;
  private adLockUntil: number = 0;
  private lastOpenedAdWindow: Window | null = null;
  private adListeners: Set<(event: AdTriggerEvent) => void> = new Set();
  private clickStats = {
    posterClicks: 0,
    screenshotClicks: 0,
    mediatorClicks: 0,
    searchClicks: 0,
    pushNotificationClicks: 0,
    monetagClicks: 0,
    monetagBackToBackClicks: 0,
    monetagSmartLinkClicks: 0,
    totalBlockedUntrusted: 0,
  };
  private isInitialized = false;

  public isApkEnvironment(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any)?.standalone === true;
      const isWebView = /wv|Android.*Version\/[0-9.]+/i.test(navigator.userAgent) || /SigmaFlix|Aplex/i.test(navigator.userAgent);
      return Boolean(isStandalone || isWebView);
    } catch {
      return false;
    }
  }

  public isAdminActive(): boolean {
    if (typeof window === "undefined") return false;
    try {
      // Ads are blocked ONLY when user is currently viewing the admin dashboard
      return (
        document.body.classList.contains("is-admin-active") ||
        window.location.pathname.startsWith("/admin") ||
        window.location.hash.includes("admin")
      );
    } catch {
      return false;
    }
  }

  public onAdTriggered(listener: (event: AdTriggerEvent) => void): () => void {
    this.adListeners.add(listener);
    return () => {
      this.adListeners.delete(listener);
    };
  }

  public closeOpenedAdWindow(): boolean {
    if (this.lastOpenedAdWindow && !this.lastOpenedAdWindow.closed) {
      try {
        this.lastOpenedAdWindow.close();
        this.lastOpenedAdWindow = null;
        return true;
      } catch (err) {
        console.warn("Could not close ad window:", err);
      }
    }
    return false;
  }

  public getLastOpenedAdWindow(): Window | null {
    return this.lastOpenedAdWindow;
  }

  public notifyAdTriggered(
    network: 'Adsterra' | 'Monetag',
    source: string,
    url?: string,
    windowRef?: Window | null,
    isMobile?: boolean
  ): void {
    const event: AdTriggerEvent = { network, source, timestamp: Date.now(), url, windowRef, isMobile };
    this.adListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error("AdService listener error:", e);
      }
    });
  }

  /**
   * Cuts and cleans all injected ad iframes, popunder overlays, and cancels active ad states.
   * Gives users a reliable in-app AI skip button that removes ads.
   */
  public cutAndCleanAllAds(): void {
    if (typeof document === "undefined") return;

    try {
      // Close any opened mobile ad tab window immediately
      this.closeOpenedAdWindow();

      // 1. Remove all ad iframes
      document.querySelectorAll('iframe').forEach((el) => {
        const src = (el.src || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const cls = (el.className || '').toString().toLowerCase();
        if (
          src.includes('profitablerate') ||
          src.includes('highperformanceformat') ||
          src.includes('alwingulla') ||
          src.includes('monetag') ||
          src.includes('adsterra') ||
          src.includes('popunder') ||
          id.includes('adsterra') ||
          id.includes('monetag') ||
          cls.includes('ad-') ||
          cls.includes('adsterra') ||
          cls.includes('monetag')
        ) {
          el.remove();
        }
      });

      // 2. Remove third-party ad overlays or social bars
      document.querySelectorAll('div, ins').forEach((el) => {
        const id = (el.id || '').toLowerCase();
        const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
        if (
          id.includes('adsterra') ||
          id.includes('monetag') ||
          id.includes('socialbar') ||
          cls.includes('social-bar') ||
          cls.includes('monetag') ||
          cls.includes('adsterra') ||
          (el.tagName === 'INS' && cls.includes('adsby'))
        ) {
          el.remove();
        }
      });
    } catch (err) {
      console.warn("AdService: cleanup notice:", err);
    }

    // Reset ad timers so user doesn't get re-bombarded
    this.lastTriggerTime = Date.now();
    this.lastMonetagTriggerTime = Date.now();
  }

  constructor() {
    this.init();
  }

  public init() {
    if (typeof window === "undefined" || this.isInitialized) return;
    this.isInitialized = true;

    // Load cached config from localStorage for instantaneous response
    try {
      const cached = localStorage.getItem("adsterra_config");
      if (cached) {
        this.config = { ...this.config, ...JSON.parse(cached) };
      }
    } catch {}

    // Listen to real-time changes from Firestore site_settings/ads
    try {
      const docRef = doc(db, "site_settings", "ads");
      onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<AdConfig>;
          this.config = {
            ...this.config,
            ...data,
          };
          try {
            localStorage.setItem("adsterra_config", JSON.stringify(this.config));
          } catch {}
        }
      }, (err) => {
        console.warn("AdService: Remote config listener error (using local fallbacks):", err);
      });
    } catch (err) {
      console.warn("AdService: Init error:", err);
    }
  }

  public getConfig(): AdConfig {
    return { ...this.config };
  }

  public async updateConfig(newConfig: Partial<AdConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig, lastUpdated: Date.now() };
    try {
      localStorage.setItem("adsterra_config", JSON.stringify(this.config));
      const docRef = doc(db, "site_settings", "ads");
      await setDoc(docRef, this.config, { merge: true });
    } catch (err) {
      console.error("AdService: Failed to save ad config to Firestore:", err);
    }
  }

  /**
   * Verifies whether an interaction is a genuine, legitimate human user action.
   * Filters out automated bots, synthetic clicks, and rapid multi-tap bursts.
   */
  public isLegitimateUserInteraction(
    e?: React.SyntheticEvent | Event | any,
    source?: 'poster' | 'screenshot' | 'mediator_get_link' | 'mediator_page_click' | 'search_box' | 'push_notification'
  ): boolean {
    if (!this.config.enableLegitimateCheck) {
      return true;
    }

    // 1. Verify Event Trustworthiness (DOM Level 3 event.isTrusted)
    // Synthetic / bot clicks set isTrusted to false
    if (e) {
      const native = e.nativeEvent || e;
      if (typeof native.isTrusted === "boolean" && native.isTrusted === false) {
        this.clickStats.totalBlockedUntrusted++;
        return false;
      }
    }

    // 2. Legitimate Source Validation
    const allowedSources = ['poster', 'screenshot', 'mediator_get_link', 'mediator_page_click', 'search_box', 'push_notification'];
    if (source && !allowedSources.includes(source)) {
      return false;
    }

    // 3. Cadence check (lightweight threshold to ensure instant response while filtering duplicate micro-bounces)
    const now = Date.now();
    const threshold = (source === 'poster' || source === 'screenshot' || source === 'push_notification') ? 150 : Math.min(this.config.minClickIntervalMs || 200, 300);
    if (now - this.lastTriggerTime < threshold) {
      return false;
    }

    return true;
  }

  /**
   * Resolves the most resilient Adsterra Direct Link URL with automatic domain fallbacks.
   */
  public getActiveDirectLink(): string {
    if (this.config.primaryDirectLink && this.config.primaryDirectLink.trim().length > 0) {
      return this.config.primaryDirectLink.trim();
    }
    return this.config.fallbackDirectLink || DEFAULT_CONFIG.primaryDirectLink;
  }

  /**
   * Triggers an ad on verified legitimate user action with maximum RPM resilience.
   * Employs synchronous window open and anchor click fallback to bypass aggressive blockers.
   */
  public triggerLegitimateAd(
    source: 'poster' | 'screenshot' | 'mediator_get_link' | 'mediator_page_click' | 'search_box' | 'push_notification',
    e?: React.SyntheticEvent | Event | any
  ): boolean {
    if (this.isAdminActive()) {
      return false;
    }

    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    if (!this.isLegitimateUserInteraction(e, source)) {
      return false;
    }

    // Strict Anti-Collision & 1-Ad-Only Lock
    const now = Date.now();
    if (now < this.adLockUntil) {
      return false;
    }
    this.adLockUntil = now + 2500;
    this.lastTriggerTime = now;

    // Increment source-specific interaction count
    if (source === 'poster') this.clickStats.posterClicks++;
    else if (source === 'screenshot') this.clickStats.screenshotClicks++;
    else if (source === 'mediator_get_link' || source === 'mediator_page_click') this.clickStats.mediatorClicks++;
    else if (source === 'search_box') this.clickStats.searchClicks++;
    else if (source === 'push_notification') this.clickStats.pushNotificationClicks++;

    const directLink = this.getActiveDirectLink();
    const isMobile = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);
    const inApk = this.isApkEnvironment();

    try {
      if (inApk) {
        // Inside APK: In-App Ad viewer displays the ad with 2-3s countdown & Skip button
        this.notifyAdTriggered('Adsterra', source, directLink, null, true);
        return true;
      }

      // Single window open on Mobile Browser / Desktop (strictly 1 ad, never duplicate!)
      let newWin: Window | null = null;
      try {
        newWin = isMobile ? window.open(directLink, "_blank") : window.open(directLink, "_blank", "noopener,noreferrer");
        if (newWin) {
          this.lastOpenedAdWindow = newWin;
        }
      } catch (openErr) {
        newWin = null;
      }
      this.notifyAdTriggered('Adsterra', source, directLink, newWin, isMobile);

      // Only if window.open was completely blocked (returned null), fallback to single link click
      if (!newWin) {
        const a = document.createElement("a");
        a.href = directLink;
        a.target = "_blank";
        a.rel = isMobile ? "noreferrer" : "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return true;
    } catch (err) {
      console.warn("AdService: Adsterra window.open fallback:", err);
      this.notifyAdTriggered('Adsterra', source, directLink, null, isMobile);
      return false;
    }
  }

  /**
   * Directly triggers an Adsterra Direct Link / Popunder for designated interactions
   * (Movie download buttons, episode buttons, or empty divs).
   */
  public triggerAdsterraDirect(
    e?: React.SyntheticEvent | Event | any,
    source: string = "movie_click",
    force: boolean = false
  ): boolean {
    if (this.isAdminActive()) {
      return false;
    }

    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    const now = Date.now();
    if (!force && now < this.adLockUntil) {
      return false;
    }
    this.adLockUntil = now + 2500;
    this.lastTriggerTime = now;

    if (source === 'download_button' || source === 'episode_button') {
      this.clickStats.mediatorClicks++;
    }

    const directLink = this.getActiveDirectLink();
    const isMobile = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);
    const inApk = this.isApkEnvironment();

    try {
      if (inApk) {
        // Inside APK: In-App Ad viewer handles the ad with 2-3s countdown & Skip button
        this.notifyAdTriggered('Adsterra', source, directLink, null, true);
        return true;
      }

      let newWin: Window | null = null;
      try {
        newWin = isMobile ? window.open(directLink, "_blank") : window.open(directLink, "_blank", "noopener,noreferrer");
        if (newWin) {
          this.lastOpenedAdWindow = newWin;
        }
      } catch (openErr) {
        newWin = null;
      }
      this.notifyAdTriggered('Adsterra', source, directLink, newWin, isMobile);

      // Only if window.open was completely blocked (returned null), fallback to single link click
      if (!newWin) {
        const a = document.createElement("a");
        a.href = directLink;
        a.target = "_blank";
        a.rel = isMobile ? "noreferrer" : "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return true;
    } catch (err) {
      console.warn("AdService: Adsterra direct link fallback:", err);
      this.notifyAdTriggered('Adsterra', source, directLink, null, isMobile);
      return false;
    }
  }

  /**
   * Resolves the active Monetag SmartLink / Direct Link URL.
   */
  public getActiveMonetagLink(): string {
    if (this.config.monetagDirectLink && this.config.monetagDirectLink.trim().length > 0) {
      return this.config.monetagDirectLink.trim();
    }
    return DEFAULT_CONFIG.monetagDirectLink;
  }

  /**
   * Directly triggers Monetag SmartLink / Direct link for Web Series episodes & Monetag targets.
   * Handles Mobile and Laptop/Desktop separately.
   */
  public triggerMonetagDirect(
    e?: React.SyntheticEvent | Event | any,
    source: string = "series_episode",
    isMobile: boolean = false
  ): boolean {
    if (this.isAdminActive()) {
      return false;
    }

    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    const now = Date.now();
    if (now < this.adLockUntil) {
      return false;
    }
    this.adLockUntil = now + 2500;
    this.lastMonetagTriggerTime = now;
    this.clickStats.monetagClicks++;

    const monetagUrl = this.getActiveMonetagLink();
    const inApk = this.isApkEnvironment();

    try {
      if (inApk) {
        // Inside APK: In-App Ad viewer displays the ad with 2-3s countdown & Skip button
        this.notifyAdTriggered('Monetag', source, monetagUrl, null, true);
        return true;
      }

      if (isMobile) {
        // Mobile device: opens strictly 1 clean tab with Monetag link
        let newWin: Window | null = null;
        try {
          newWin = window.open(monetagUrl, "_blank");
          if (newWin) {
            this.lastOpenedAdWindow = newWin;
          }
        } catch (openErr) {
          newWin = null;
        }

        this.notifyAdTriggered('Monetag', source, monetagUrl, newWin, true);

        // Only fallback if window.open was completely blocked
        if (!newWin) {
          const a = document.createElement("a");
          a.href = monetagUrl;
          a.target = "_blank";
          a.rel = "noreferrer";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } else {
        // Laptop / PC Desktop: opens Monetag tab / popunder
        let newWin: Window | null = null;
        try {
          newWin = window.open(monetagUrl, "_blank", "noopener,noreferrer");
        } catch (openErr) {
          newWin = null;
        }

        this.notifyAdTriggered('Monetag', source, monetagUrl, newWin, false);

        if (!newWin) {
          const a = document.createElement("a");
          a.href = monetagUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }
      return true;
    } catch (err) {
      console.warn("AdService: Monetag direct trigger fallback:", err);
      this.notifyAdTriggered('Monetag', source, monetagUrl, null, isMobile);
      return false;
    }
  }

  /**
   * Triggers a Monetag Popunder / Direct SmartLink on user-specified elements.
   * Completely isolated from Adsterra so codes/triggers never collide.
   */
  public triggerMonetagPopunder(
    e?: React.SyntheticEvent | Event | any,
    _source: string = "monetag_element",
    force: boolean = false
  ): boolean {
    if (this.isAdminActive()) {
      return false;
    }

    if (!this.config.monetagPopunderEnabled) {
      return false;
    }

    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    // 1. Verify Event Authenticity
    if (this.config.enableLegitimateCheck && e) {
      const native = e.nativeEvent || e;
      if (typeof native.isTrusted === "boolean" && !native.isTrusted) {
        this.clickStats.totalBlockedUntrusted++;
        return false;
      }
    }

    // 2. Anti-collision & Cadence check:
    const now = Date.now();
    if (!force && now < this.adLockUntil) {
      return false;
    }
    this.adLockUntil = now + 2500;
    this.lastMonetagTriggerTime = now;
    this.clickStats.monetagClicks++;

    const monetagUrl = this.getActiveMonetagLink();
    const isMobile = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);
    const inApk = this.isApkEnvironment();

    try {
      if (inApk) {
        // Inside APK: In-App Ad viewer displays the ad with 2-3s countdown & Skip button
        this.notifyAdTriggered('Monetag', _source, monetagUrl, null, true);
        return true;
      }

      let newWin: Window | null = null;
      try {
        newWin = isMobile ? window.open(monetagUrl, "_blank") : window.open(monetagUrl, "_blank", "noopener,noreferrer");
        if (newWin) {
          this.lastOpenedAdWindow = newWin;
        }
      } catch (openErr) {
        newWin = null;
      }
      this.notifyAdTriggered('Monetag', _source, monetagUrl, newWin, isMobile);

      if (!newWin) {
        const a = document.createElement("a");
        a.href = monetagUrl;
        a.target = "_blank";
        a.rel = isMobile ? "noreferrer" : "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return true;
    } catch (err) {
      console.warn("AdService: Monetag popunder trigger notice:", err);
      this.notifyAdTriggered('Monetag', _source, monetagUrl, null, isMobile);
      return false;
    }
  }

  /**
   * Back-to-Back 2-step Monetag Popunder for Movie Links on Laptop/Tablet
   * First click = popunder 1
   * Second click = popunder 2 back-to-back
   */
  public triggerBackToBackMonetagPopunder(
    e?: React.SyntheticEvent | Event | any,
    clickIndex: number = 1
  ): boolean {
    this.clickStats.monetagBackToBackClicks++;
    return this.triggerMonetagPopunder(e, `movie_link_popunder_${clickIndex}`, true);
  }

  /**
   * Monetag SmartLink trigger for Public Home Page empty space / general clicks
   */
  public triggerMonetagSmartLink(
    e?: React.SyntheticEvent | Event | any,
    source: string = "home_empty_space"
  ): boolean {
    if (!this.config.monetagPopunderEnabled) {
      return false;
    }

    const now = Date.now();
    // Allow smartlink trigger with 1.5s cooldown for fast, instant response
    if (now - this.lastMonetagTriggerTime < 1500) {
      return false;
    }

    this.clickStats.monetagSmartLinkClicks++;
    return this.triggerMonetagPopunder(e, source, false);
  }

  /**
   * Test/Validate Adsterra Publisher API connection if token is provided.
   */
  public async testAdsterraApi(apiToken?: string): Promise<{ success: boolean; message: string }> {
    const token = apiToken || this.config.adsterraApiToken;
    if (!token || !token.trim()) {
      return { success: false, message: "No Adsterra API Token provided." };
    }

    try {
      // Adsterra API v3 endpoint test via fetch
      const res = await fetch(`https://api3.adsterratools.com/publisher/${token.trim()}/placements.json`, {
        method: "GET",
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          message: `Adsterra API connected successfully! Found ${Array.isArray(data?.items) ? data.items.length : 'active'} placements.`,
        };
      } else {
        return {
          success: false,
          message: `Adsterra API returned status ${res.status}. Please check your token permissions.`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `API check notice: ${err?.message || 'Direct browser-to-API call limited by CORS; direct links remain 100% active.'}`,
      };
    }
  }

  public getStats() {
    return { ...this.clickStats };
  }
}

export const adService = new AdService();
