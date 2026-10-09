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
  monetagClickIntervalMs: 8000,
  enableLegitimateCheck: true,
  minClickIntervalMs: 1200,
};

class AdService {
  private config: AdConfig = { ...DEFAULT_CONFIG };
  private lastTriggerTime: number = 0;
  private lastMonetagTriggerTime: number = 0;
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

    // 3. Human cadence check (minimum threshold to prevent invalid burst clicks)
    const now = Date.now();
    const threshold = (source === 'poster' || source === 'screenshot' || source === 'push_notification') ? 500 : this.config.minClickIntervalMs;
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
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    if (!this.isLegitimateUserInteraction(e, source)) {
      return false;
    }

    this.lastTriggerTime = Date.now();

    // Increment source-specific interaction count
    if (source === 'poster') this.clickStats.posterClicks++;
    else if (source === 'screenshot') this.clickStats.screenshotClicks++;
    else if (source === 'mediator_get_link' || source === 'mediator_page_click') this.clickStats.mediatorClicks++;
    else if (source === 'search_box') this.clickStats.searchClicks++;
    else if (source === 'push_notification') this.clickStats.pushNotificationClicks++;

    const directLink = this.getActiveDirectLink();

    try {
      // Direct high-priority window open for authentic user gestures
      const newWin = window.open(directLink, "_blank", "noopener,noreferrer");
      if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
        // Fallback for browsers with strict pop-up constraints
        const a = document.createElement("a");
        a.href = directLink;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return true;
    } catch (err) {
      console.warn("AdService: window.open fallback triggered:", err);
      try {
        const a = document.createElement("a");
        a.href = directLink;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return true;
      } catch (innerErr) {
        console.error("AdService: All delivery methods failed:", innerErr);
        return false;
      }
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
    const now = Date.now();
    const threshold = force ? 300 : 3500;
    if (!force && now - this.lastTriggerTime < threshold) {
      return false;
    }

    this.lastTriggerTime = now;
    if (source === 'download_button' || source === 'episode_button') {
      this.clickStats.mediatorClicks++;
    }

    const directLink = this.getActiveDirectLink();

    try {
      const newWin = window.open(directLink, "_blank", "noopener,noreferrer");
      if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
        const a = document.createElement("a");
        a.href = directLink;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return true;
    } catch (err) {
      console.warn("AdService: Adsterra direct link fallback triggered:", err);
      try {
        const a = document.createElement("a");
        a.href = directLink;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return true;
      } catch (inner) {
        return false;
      }
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
    const monetagUrl = this.getActiveMonetagLink();
    this.lastMonetagTriggerTime = Date.now();
    this.clickStats.monetagClicks++;

    try {
      if (isMobile) {
        // Mobile device: opens clean new tab with Monetag link
        const newWin = window.open(monetagUrl, "_blank");
        if (!newWin || newWin.closed || typeof newWin.closed === "undefined") {
          const a = document.createElement("a");
          a.href = monetagUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } else {
        // Laptop / PC Desktop: opens Monetag tab / popunder
        const newWin = window.open(monetagUrl, "_blank", "noopener,noreferrer");
        if (newWin) {
          try {
            window.focus();
          } catch {}
        } else {
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
      try {
        const a = document.createElement("a");
        a.href = monetagUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return true;
      } catch {
        return false;
      }
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
    if (!this.config.monetagPopunderEnabled) {
      return false;
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
    // Ensures Monetag and Adsterra do not clash simultaneously
    const now = Date.now();
    const minInterval = force ? 400 : (this.config.monetagClickIntervalMs || 8000);
    if (now - this.lastMonetagTriggerTime < minInterval) {
      return false;
    }
    // Respect minimum gap from any Adsterra trigger
    if (!force && now - this.lastTriggerTime < 2000) {
      return false;
    }

    this.lastMonetagTriggerTime = now;
    this.clickStats.monetagClicks++;

    const monetagUrl = this.getActiveMonetagLink();

    try {
      // Popunder / background-tab simulation
      const newWin = window.open(monetagUrl, "_blank", "noopener,noreferrer");
      if (newWin) {
        try {
          window.focus();
        } catch {}
      } else {
        // Fallback for strict browser pop-up blockers
        const a = document.createElement("a");
        a.href = monetagUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return true;
    } catch (err) {
      console.warn("AdService: Monetag popunder trigger notice:", err);
      try {
        const a = document.createElement("a");
        a.href = monetagUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return true;
      } catch (inner) {
        return false;
      }
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
    // Allow smartlink trigger with 6s cooldown so user browsing feels smooth
    if (now - this.lastMonetagTriggerTime < 6000) {
      return false;
    }
    if (now - this.lastTriggerTime < 2500) {
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
