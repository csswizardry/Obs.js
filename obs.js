;(() => {

  /**
   * Obs.js uses the Navigator and Battery APIs to get realtime network and
   * battery status of your user’s device. You can use this information to
   * adapt to their context.
   */





  /**
   * Immediately disallow the inclusion of Obs.js as an external script, or as
   * an inline `type=module`, except on localhost. This file should not be run
   * asynchronously. It should not be placed externally either: that would kill
   * performance and that’s the exact opposite of what we’re trying to achieve.
   */

  const obsSrc = document.currentScript;

  if (!obsSrc || obsSrc.src || (obsSrc.type && obsSrc.type.toLowerCase() === 'module')) {
    if (/^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname) === false) {
      console.warn(
        '[Obs.js] Skipping: must be an inline, classic <script> in <head>.',
        obsSrc ? (obsSrc.src ? 'src=' + obsSrc.src : 'type=' + obsSrc.type) : 'type=module'
      );
      return;
    }
  }





  // Attach Obs.js classes to the `<html>` element.
  const html = document.documentElement;

  // Grab the `connection` property from `navigator`.
  const { connection } = navigator;

  // Store state in a global `window.obs` object for reuse later.
  window.obs = window.obs || {};

  // Make Obs.js configurable.
  const obsConfig = (window.obs && window.obs.config) || {};

  // Passively listen to changes in network or battery condition without page
  // refresh. Defaults to false.
  const observeChanges = obsConfig.observeChanges === true;

  // Helper function:
  //
  // Bucket RTT into the nearest upper 25ms. E.g. an RTT of 108ms would be put
  // into the 125ms bucket. Think of 125ms as being 101–125ms.
  const bucketRTT = rtt =>
    Number.isFinite(rtt) ? Math.ceil(rtt / 25) * 25 : null;

  // Helper function:
  //
  // Categorise the observed RTT into CrUX’s High, Medium, Low latency
  // thresholds: https://developer.chrome.com/blog/crux-2025-02#rtt_tri-bins
  const categoriseRTT = rtt =>
    Number.isFinite(rtt)
      ? (rtt < 75 ? 'low' : rtt <= 275 ? 'medium' : 'high')
      : null;

  // Helper function:
  //
  // Bucket downlink to 1Mbps steps. This coarsens the reported `downlink` by
  // a factor of 40. Chromium-based browsers commonly cap around ~10Mbps for
  // privacy reasons, so you may not ever see values above ~10.
  // https://caniuse.com/mdn-api_networkinformation_downlink
  const bucketDownlink = d =>
    Number.isFinite(d) ? Math.ceil(d) : null;

  // Combine network capability (RTT + bandwidth) and user/device preferences
  // (Save-Data, low battery) into a delivery ‘Stance’.
  //
  // Exposes on `window.obs`:
  //
  // * connectionCapability: 'strong'|'moderate'|'weak'
  // * conservationPreference: 'conserve'|'neutral'
  // * deliveryMode: 'rich'|'cautious'|'lite'
  // * canShowRichMedia: boolean
  // * shouldAvoidRichMedia: boolean
  const recomputeDelivery = () => {
    const o = window.obs || {};

    // Classify connection strength based on RTT and downlink.
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

    // Classify resource conservation based on Save-Data and battery level.
    const conserve = (o.dataSaver === true) || (o.batteryLow === true);
    o.conservationPreference = conserve ? 'conserve' : 'neutral';

    // Combined delivery Stance based on connection strength and resource
    // conservation.
    const rich  = !conserve && o.connectionCapability === 'strong';
    const avoid =  conserve || o.connectionCapability === 'weak';
    o.deliveryMode = rich ? 'rich' : (avoid ? 'lite' : 'cautious');

    // Assign delivery Stances into convenient booleans,
    // E.g.: `if(canShowRichMedia) { … }`
    o.canShowRichMedia     = (o.deliveryMode === 'rich');
    o.shouldAvoidRichMedia = (o.deliveryMode === 'lite');

    // Add classes to the `<html>` element for each of our connection-capability
    // Stances.
    ['strong','moderate','weak'].forEach(t => {
      html.classList.remove(`has-connection-capability-${t}`);
    });
    html.classList.add(`has-connection-capability-${o.connectionCapability}`);

    // Add classes to the `<html>` element for each of our conservation Stances.
    // E.g. `<html class="has-conservation-preference-conserve">`
    // Remove any leftover classes from previous run.
    ['conserve','neutral'].forEach(t => {
      html.classList.remove(`has-conservation-preference-${t}`);
    });
    html.classList.add(`has-conservation-preference-${o.conservationPreference}`);

    // Add classes to the `<html>` element for each of our delivery Stances.
    // E.g. `<html class="has-delivery-mode-rich">`
    // Remove any leftover classes from previous run.
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

    // Add a class to the `<html>` element if someone has Data Saver mode
    // enabled.
    window.obs.dataSaver = !!saveData;
    html.classList.toggle('has-data-saver', !!saveData);

    // Get latency information from `rtt`. Bucket it into our predefined
    // thresholds.
    const rttBucket = bucketRTT(rtt);
    if (rttBucket != null) window.obs.rttBucket = rttBucket;

    // Add high, medium, low latency classes to the `<html>` element.
    // E.g. `<html class="has-latency-low">`
    const rttCategory = categoriseRTT(rtt);
    if (rttCategory) {
      window.obs.rttCategory = rttCategory;
      // Remove any prior latency class then add the current one.
      ['low', 'medium', 'high']
        .forEach(l => html.classList.remove(`has-latency-${l}`));
      html.classList.add(`has-latency-${rttCategory}`);
    }

    // Get bandwidth information from `downlink`. Bucket it into our preference
    // thresholds.
    const downlinkBucket = bucketDownlink(downlink);
    if (downlinkBucket != null) {
      window.obs.downlinkBucket = downlinkBucket; // 1‑Mbps

      // Add low, medium, or high bandwidth classes to the `<html>` element.
      // low  = ≤5 Mbps, medium = 6–7 Mbps, high = ≥8 Mbps
      // E.g. `<html class="has-bandwidth-high">`
      const downlinkCategory =
        downlinkBucket <= 5 ? 'low' :
        downlinkBucket >= 8 ? 'high' : 'medium';

      window.obs.downlinkCategory = downlinkCategory;

      ['low', 'medium', 'high']
        .forEach(b => html.classList.remove(`has-bandwidth-${b}`));
      html.classList.add(`has-bandwidth-${downlinkCategory}`);
    }

    // Obs.js doesn’t currently do anything with it, but we capture the maximum
    // estimated `downlink` while we’re here.
    if ('downlinkMax' in connection) {
      window.obs.downlinkMax = connection.downlinkMax;
    }

    // Update delivery Stance combining capability and conservation preferences.
    recomputeDelivery();

  };

  // Run the connection function as soon as Obs.js loads.
  refreshConnectionStatus();

  // If configured, listen out for network condition changes and rerun the
  // function in response.
  if (observeChanges && connection && typeof connection.addEventListener === 'function') {
    connection.addEventListener('change', refreshConnectionStatus);
  }





  // Run this function on demand to grab fresh data from the Battery API.
  const refreshBatteryStatus = battery => {

    if (!battery) return;

    // Get battery level and charging status.
    const { level, charging } = battery;

    // The API doesn’t report Low Power Mode or similar. Therefore, treat ≤5% as
    // ‘critical’ and ≤20% as ‘low’.
    const critical = Number.isFinite(level) ? level <= 0.05 : null;
    window.obs.batteryCritical = critical;

    const low = Number.isFinite(level) ? level <= 0.2 : null;
    window.obs.batteryLow = low;

    // Add battery classes (subset model): at ≤5% we want BOTH low and critical.
    // First remove leftovers, then add any that apply.
    // E.g. `<html class="has-battery-low has-battery-critical">`
    ['critical','low'].forEach(t => html.classList.remove(`has-battery-${t}`));
    if (low)      html.classList.add('has-battery-low');
    if (critical) html.classList.add('has-battery-critical');

    // Add a class to the `<html>` element if the device is currently charging.
    // E.g. `<html class="has-battery-charging">`
    const isCharging = !!charging;
    window.obs.batteryCharging = isCharging;
    html.classList.toggle('has-battery-charging', isCharging);

    // Update delivery Stance combining capability and preferences.
    recomputeDelivery();

  };

  // The Battery API returns a Promise: get to work on it once it resolves.
  if ('getBattery' in navigator) {
    navigator.getBattery()

      .then(battery => {

        // Run the battery function immediately.
        refreshBatteryStatus(battery);

        // If configured, listen out for battery changes and rerun the function
        // in response.
        if (observeChanges && typeof battery.addEventListener === 'function') {
          battery.addEventListener('levelchange', () => refreshBatteryStatus(battery));
          battery.addEventListener('chargingchange', () => refreshBatteryStatus(battery));
        }
      })

      // Fail silently otherwise.
      .catch(() => { /* no‑op */ });
  }
})();
