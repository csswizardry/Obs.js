(() => {

  /**
   * obs.js uses the Navigator and Battery APIs to get realtime network and
   * battery status of your users’ device. You can use this information to
   * adapt to their context, or send the data off to SpeedCurve with
   * `obs-speedcurve.js`.
   */

  // Attach classes to the document.
  const html = document.documentElement;

  // Grab the `connection` property from `navigator`.
  const { connection } = navigator;

  // Store state in a global `obs` object for reuse later in your application.
  window.obs = window.obs || {};

  // Optional logging driven by configuration.
  // Set before loading obj.js, e.g.:
  //   window.obs = { config: { log: true } }
  const obsConfig = (window.obs && window.obs.config) || {};
  const shouldLog = !!obsConfig.log;

  // Simple logger: prints current values on `window.obs` (except `config`).
  const logObs = () => {
    if (!shouldLog) return;
    try {
      for (const [key, value] of Object.entries(window.obs)) {
        if (key === 'config') continue;
        console.log('[obs]', key, value);
      }
    } catch (e) {
      for (const key in window.obs) {
        if (Object.prototype.hasOwnProperty.call(window.obs, key) && key !== 'config') {
          console.log('[obs]', key, window.obs[key]);
        }
      }
    }
  };

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

      // Somewhat opinionated decision to mark low latency and high downlink
      // connections as strong, and high latency and low downlink connections as
      // weak.
      const latencyIsLow  = window.obs.rttCategory === 'low';
      const latencyIsHigh = window.obs.rttCategory === 'high';
      const bandwidthIsLow  = isLow;
      const bandwidthIsHigh = isHigh;
      html.classList.toggle('has-connection-strong', latencyIsLow && bandwidthIsHigh);
      html.classList.toggle('has-connection-weak',   latencyIsHigh && bandwidthIsLow);

    }

    // We don’t do anything with it, but get maximum estimated `downlink` while
    // we’re here.
    if ('downlinkMax' in connection) {
      window.obs.downlinkMax = connection.downlinkMax;
    }

  };

  // Run the connection function immediately.
  refreshConnectionStatus();

  // Listen out for network condition changes and rerun the function.
  if (connection && typeof connection.addEventListener === 'function') {
    connection.addEventListener('change', refreshConnectionStatus, {
      passive: true
    });
  }





  // Run this function on demand to grab fresh data from the Battery API.
  const refreshBatteryStatus = battery => {

    if (!battery) return;

    // Get battery level and charging status.
    const { level, charging } = battery;

    // The API doesn’t report Low Power Mode or similar, so let’s just assume
    // that a device with less than 20% charge is considered ‘low’.
    const low = Number.isFinite(level) ? level <= 0.2 : null;
    window.obs.batteryLow = low;

    // Add low-battery class to `html` element.
    html.classList.toggle('has-battery-low', !!low);

    // Add a class to the `html` element if the device is currently charging
    const isCharging = !!charging;
    window.obs.batteryCharging = isCharging;
    html.classList.toggle('has-battery-charging', isCharging);

    // Once Battery has returned, log everything we have.
    logObs();

  };

  // Battery metrics (best‑effort and privacy‑respecting).
  if ('getBattery' in navigator) {
    navigator.getBattery()
      .then(battery => {
        // Run the battery function immediately.
        refreshBatteryStatus(battery);

        // Listen out for battery changes and rerun the function.
        if (typeof battery.addEventListener === 'function') {
          battery.addEventListener('levelchange', () =>
            refreshBatteryStatus(battery)
          );
          battery.addEventListener('chargingchange', () =>
            refreshBatteryStatus(battery)
          );
        }
      })

      // Fail silently.
      .catch(() => { /* no‑op */ });
  }

})();
