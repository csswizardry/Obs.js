;(() => {

  /**
   * Obs.js uses the Navigator and Battery APIs to get realtime network and
   * battery status of your user’s device. You can use this information to
   * adapt to their context, or send the data off to SpeedCurve with
   * `obs-speedcurve.js`.
   */

  // Immediately disallow the inclusion of Obs.js as an external script—or as an
  // inline `type=module`—except on localhost. This file cannot be run
  // asynchronously, which means it should not be placed externally either: that
  // would kill performance and that’s the exact opposite of what we’re trying
  // to achieve.
  const obsSrc = document.currentScript;

  if (!obsSrc || obsSrc.src || (obsSrc.type && obsSrc.type.toLowerCase() === 'module')) {
    if (/^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname) === false) {
      console.warn(
        '[obs] Skipping: must be an inline, classic <script> in <head>.',
        obsSrc ? (obsSrc.src ? 'src=' + obsSrc.src : 'type=' + obsSrc.type) : 'type=module'
      );
      return;
    }
  }

  // Attach classes to the document.
  const html = document.documentElement;

  // Grab the `connection` property from `navigator`.
  const { connection } = navigator;

  // Store state in a global `window.obs` object for reuse later in your application.
  window.obs = window.obs || {};

  const obsConfig = (window.obs && window.obs.config) || {};
  const observeChanges = obsConfig.observeChanges !== false;

  // Helper function:
  // Bucket RTT into the nearest upper 25ms. E.g. an RTT of 108ms would be put
  // into the 125ms bucket. Think of 125ms as being 100–125ms.
  const bucketRTT = rtt =>
    Number.isFinite(rtt) ? Math.ceil(rtt / 25) * 25 : null;

  // Helper function:
  // Categorise the observed RTT into CrUX’s High, Medium, Low latency
  // thresholds: https://developer.chrome.com/blog/crux-2025-02#rtt_tri-bins
  const categoriseRTT = rtt =>
    Number.isFinite(rtt)
      ? (rtt < 75 ? 'low' : rtt <= 275 ? 'medium' : 'high')
      : null;

  // Helper function:
  // Bucket downlink to 1Mbps steps. This coarsens the reported `downlink` by
  // a factor of 40. Chromium-based browsers often report up to ~10 Mbps due to
  // privacy constraints, so don’t expect to see a number greater than 10:
  // https://caniuse.com/mdn-api_networkinformation_downlink
  const bucketDownlink = d =>
    Number.isFinite(d) ? Math.ceil(d) : null;

  // Combine network capability (RTT + bandwidth) and user/device preferences
  // (Save-Data, low battery) into a delivery stance.
  //
  // Exposes on `window.obs`:
  //   - connectionCapability: 'strong'|'moderate'|'weak'
  //   - conservationPreference: 'conserve'|'neutral'
  //   - deliveryMode: 'rich'|'cautious'|'lite'
  //   - canShowRichMedia: boolean
  //   - shouldAvoidRichMedia: boolean
  const recomputeDelivery = () => {
    const o = window.obs || {};

    // Capability from network only (RTT + bandwidth)
    const bw = typeof o.downlinkBucket === 'number' ? o.downlinkBucket : null;
    const lowRTT  = o.rttCategory === 'low';
    const highRTT = o.rttCategory === 'high';
    const highBW  = bw != null && bw >= 8; // 1Mbps buckets
    const lowBW   = bw != null && bw <= 5;

    o.connectionCapability = (lowRTT && highBW)
      ? 'strong'
      : (highRTT || lowBW)
      ? 'weak'
      : 'moderate';

    // Preference/context (user choice + device state)
    const conserve = (o.dataSaver === true) || (o.batteryLow === true);
    o.conservationPreference = conserve ? 'conserve' : 'neutral';

    // Combined delivery stance we key behaviour from
    const rich  = !conserve && o.connectionCapability === 'strong';
    const avoid =  conserve || o.connectionCapability === 'weak';
    o.deliveryMode = rich ? 'rich' : (avoid ? 'lite' : 'cautious');

    // Convenience booleans
    o.canShowRichMedia     = (o.deliveryMode === 'rich');
    o.shouldAvoidRichMedia = (o.deliveryMode === 'lite');

    // Add classes to the `html` element for each of our delivery stances.
    ['strong','moderate','weak'].forEach(t => {
      html.classList.remove(`has-connection-capability-${t}`);
    });
    html.classList.add(`has-connection-capability-${o.connectionCapability}`);

    // Preference classes (new) + remove legacy
    ['conserve','neutral'].forEach(t => {
      html.classList.remove(`has-conservation-preference-${t}`);
    });
    html.classList.add(`has-conservation-preference-${o.conservationPreference}`);

    // Delivery classes (new) + remove legacy
    ['rich','cautious','lite'].forEach(t => {
      html.classList.remove(`has-delivery-mode-${t}`);
    });
    html.classList.add(`has-delivery-mode-${o.deliveryMode}`);
  };

  // Run this function on demand to grab fresh data from the Network Information
  // API.
  const refreshConnectionStatus = () => {

    if (!connection) return;

    // We need to know about Data Saver mode, latency estimates, and bandwidth
    // estimates.
    const { saveData, rtt, downlink } = connection;

    // Add a class to the `html` element if someone has Data Saver mode enabled.
    window.obs.dataSaver = !!saveData;
    html.classList.toggle('has-data-saver', !!saveData);

    // Get latency information from `rtt`.
    const rttBucket = bucketRTT(rtt);
    if (rttBucket != null) window.obs.rttBucket = rttBucket;

    // Add high, medium, low latency classes to the `html` element.
    const rttCategory = categoriseRTT(rtt);
    if (rttCategory) {
      window.obs.rttCategory = rttCategory;
      // Remove any prior latency class then add the current one.
      ['low', 'medium', 'high']
        .forEach(l => html.classList.remove(`has-latency-${l}`));
      html.classList.add(`has-latency-${rttCategory}`);
    }

    // Get bandwidth information from `downlink`.
    const downlinkBucket = bucketDownlink(downlink);
    if (downlinkBucket != null) {
      window.obs.downlinkBucket = downlinkBucket; // 1‑Mbps
      // Add classes for either low or high bandwidth (with a dead zone).
      const isLow = downlinkBucket <= 5;
      const isHigh = downlinkBucket >= 8;
      html.classList.toggle('has-bandwidth-low', isLow);
      html.classList.toggle('has-bandwidth-high', isHigh);
    }

    // We don’t do anything with it, but get maximum estimated `downlink` while
    // we’re here.
    if ('downlinkMax' in connection) {
      window.obs.downlinkMax = connection.downlinkMax;
    }

    // Update delivery stance combining capability and preferences.
    recomputeDelivery();
  };

  // Run the connection function immediately.
  refreshConnectionStatus();

  // Listen out for network condition changes and rerun the function.
  if (observeChanges && connection && typeof connection.addEventListener === 'function') {
    connection.addEventListener('change', refreshConnectionStatus);
  }





  // Run this function on demand to grab fresh data from the Battery API.
  const refreshBatteryStatus = battery => {

    if (!battery) return;

    // Get battery level and charging status.
    const { level, charging } = battery;

    // The API doesn’t report Low Power Mode or similar. Treat ≤5% as
    // ‘critical’ and ≤20% as ‘low’.
    const critical = Number.isFinite(level) ? level <= 0.05 : null;
    window.obs.batteryCritical = critical;

    const low = Number.isFinite(level) ? level <= 0.2 : null;
    window.obs.batteryLow = low;

    // Add most urgent battery class.
    ['critical','low'].forEach(t => html.classList.remove(`has-battery-${t}`));
    if (critical) {
      html.classList.add('has-battery-critical');
    } else if (low) {
      html.classList.add('has-battery-low');
    }

    // Add a class to the `html` element if the device is currently charging
    const isCharging = !!charging;
    window.obs.batteryCharging = isCharging;
    html.classList.toggle('has-battery-charging', isCharging);

    // Update delivery stance combining capability and preferences.
    recomputeDelivery();
  };

  // Battery metrics (best‑effort and privacy‑respecting).
  if ('getBattery' in navigator) {
    navigator.getBattery()
      .then(battery => {
        // Run the battery function immediately.
        refreshBatteryStatus(battery);

        // Listen out for battery changes and rerun the function.
        if (observeChanges && typeof battery.addEventListener === 'function') {
          battery.addEventListener('levelchange', () => refreshBatteryStatus(battery));
          battery.addEventListener('chargingchange', () => refreshBatteryStatus(battery));
        }
      })

      // Fail silently.
      .catch(() => { /* no‑op */ });
  }
})();
//# sourceURL=obs.js
