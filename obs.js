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

  const obsScript = document.currentScript;
  const existingObs = window.obs;
  const obsConfig = (
    existingObs !== null &&
    typeof existingObs === 'object' &&
    existingObs.config
  ) || {};
  const adaptive = obsConfig.adaptive !== false;

  if (
    adaptive &&
    (
      !obsScript ||
      obsScript.src ||
      (obsScript.type && obsScript.type.toLowerCase() === 'module')
    )
  ) {
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) === false) {
      console.warn(
        '[Obs.js] Skipping: must be an inline, classic <script> in <head>.',
        obsScript
          ? (obsScript.src ? 'src=' + obsScript.src : 'type=' + obsScript.type)
          : 'type=module'
      );
      return;
    }
  }





  const obs = existingObs !== null && typeof existingObs === 'object'
    ? existingObs
    : {};
  window.obs = obs;

  const observeChanges = obsConfig.observeChanges === true;
  const RTT_BUCKET_MS = 25;
  const RTT_LOW_MAX_MS = 75;
  const RTT_HIGH_MIN_MS = 275;
  const DOWNLINK_LOW_MAX_MBPS = 5;
  const DOWNLINK_HIGH_MIN_MBPS = 8;
  const LATENCY_CATEGORIES = ['low', 'medium', 'high'];
  const BANDWIDTH_CATEGORIES = ['low', 'medium', 'high'];
  const RAM_CATEGORIES = ['very-low', 'low', 'medium', 'high'];
  const CPU_CATEGORIES = ['low', 'medium', 'high'];
  const DEVICE_CAPABILITIES = ['strong', 'moderate', 'weak'];
  const CONNECTION_CAPABILITIES = ['strong', 'moderate', 'weak'];
  const CONSERVATION_PREFERENCES = ['conserve', 'neutral'];
  const DELIVERY_MODES = ['rich', 'cautious', 'lite'];

  let html;
  let connection;
  let hasStarted = false;

  const setExclusiveClass = (namespace, values, activeValue) => {
    if (!adaptive) return;
    values.forEach(value => html.classList.remove(`has-${namespace}-${value}`));
    if (activeValue !== null) {
      html.classList.add(`has-${namespace}-${activeValue}`);
    }
  };

  const toggleClass = (className, force) => {
    if (!adaptive) return;
    html.classList.toggle(className, force);
  };

  const bucketRTT = rtt => {
    if (!Number.isFinite(rtt)) return null;
    return Math.ceil(rtt / RTT_BUCKET_MS) * RTT_BUCKET_MS;
  };

  const categoriseRTT = rtt => {
    if (!Number.isFinite(rtt)) return null;
    if (rtt < RTT_LOW_MAX_MS) return 'low';
    if (rtt < RTT_HIGH_MIN_MS) return 'medium';
    return 'high';
  };

  const bucketDownlink = downlink => {
    if (!Number.isFinite(downlink)) return null;
    return Math.ceil(downlink);
  };

  const categoriseDownlink = downlinkBucket => {
    if (downlinkBucket === null) return null;
    if (downlinkBucket <= DOWNLINK_LOW_MAX_MBPS) return 'low';
    if (downlinkBucket >= DOWNLINK_HIGH_MIN_MBPS) return 'high';
    return 'medium';
  };

  const categoriseDeviceMemory = memoryGB => {
    if (!Number.isFinite(memoryGB)) return null;
    if (memoryGB <= 1) return 'very-low';
    if (memoryGB <= 2) return 'low';
    if (memoryGB <= 4) return 'medium';
    return 'high';
  };

  const categoriseCpuCores = cores => {
    if (!Number.isFinite(cores)) return null;
    if (cores <= 2) return 'low';
    if (cores <= 5) return 'medium';
    return 'high';
  };

  const recomputeDeviceCapability = () => {
    const memoryCategory = obs.ramCategory;
    const cpuCategory = obs.cpuCategory;
    const memoryIsWeak = memoryCategory === 'very-low' || memoryCategory === 'low';
    const memoryCanBeStrong = memoryCategory === 'medium' || memoryCategory === 'high';
    const cpuIsWeak = cpuCategory === 'low';
    const cpuIsStrong = cpuCategory === 'high';
    let deviceCapability = 'moderate';

    if (memoryCanBeStrong && cpuIsStrong) {
      deviceCapability = 'strong';
    } else if (memoryIsWeak || cpuIsWeak) {
      deviceCapability = 'weak';
    }

    obs.deviceCapability = deviceCapability;
    setExclusiveClass('device-capability', DEVICE_CAPABILITIES, deviceCapability);
  };

  const recomputeDelivery = () => {
    const lowRTT = obs.rttCategory === 'low';
    const highRTT = obs.rttCategory === 'high';
    const lowBandwidth = obs.downlinkCategory === 'low';
    const highBandwidth = obs.downlinkCategory === 'high';

    if (lowRTT && highBandwidth) {
      obs.connectionCapability = 'strong';
    } else if (highRTT || lowBandwidth) {
      obs.connectionCapability = 'weak';
    } else {
      obs.connectionCapability = 'moderate';
    }

    const shouldConserve = (
      obs.dataSaver === true ||
      obs.batteryLow === true ||
      obs.batteryCritical === true
    );
    obs.conservationPreference = shouldConserve ? 'conserve' : 'neutral';

    const mustUseLiteMode = (
      obs.connectionCapability === 'weak' ||
      obs.dataSaver === true ||
      obs.batteryCritical === true
    );

    if (mustUseLiteMode) {
      obs.deliveryMode = 'lite';
    } else if (obs.connectionCapability === 'strong' && !shouldConserve) {
      obs.deliveryMode = 'rich';
    } else {
      obs.deliveryMode = 'cautious';
    }

    obs.canShowRichMedia = obs.deliveryMode !== 'lite';
    obs.shouldAvoidRichMedia = obs.deliveryMode === 'lite';

    setExclusiveClass(
      'connection-capability',
      CONNECTION_CAPABILITIES,
      obs.connectionCapability
    );
    setExclusiveClass(
      'conservation-preference',
      CONSERVATION_PREFERENCES,
      obs.conservationPreference
    );
    setExclusiveClass('delivery-mode', DELIVERY_MODES, obs.deliveryMode);
  };

  const refreshConnectionStatus = () => {
    if (!connection) return;

    const { saveData, rtt, downlink } = connection;
    obs.dataSaver = !!saveData;
    toggleClass('has-data-saver', obs.dataSaver);

    const rttBucket = bucketRTT(rtt);
    const rttCategory = categoriseRTT(rtt);
    if (rttBucket === null) {
      delete obs.rttBucket;
      delete obs.rttCategory;
    } else {
      obs.rttBucket = rttBucket;
      obs.rttCategory = rttCategory;
    }
    setExclusiveClass('latency', LATENCY_CATEGORIES, rttCategory);

    const downlinkBucket = bucketDownlink(downlink);
    const downlinkCategory = categoriseDownlink(downlinkBucket);
    if (downlinkBucket === null) {
      delete obs.downlinkBucket;
      delete obs.downlinkCategory;
    } else {
      obs.downlinkBucket = downlinkBucket;
      obs.downlinkCategory = downlinkCategory;
    }
    setExclusiveClass('bandwidth', BANDWIDTH_CATEGORIES, downlinkCategory);

    if ('downlinkMax' in connection) {
      obs.downlinkMax = connection.downlinkMax;
    }

    recomputeDelivery();
  };

  const refreshBatteryStatus = battery => {
    if (!battery) return;

    const { level, charging } = battery;
    const critical = Number.isFinite(level) ? level <= 0.05 : null;
    const low = Number.isFinite(level) ? level <= 0.2 : null;
    obs.batteryCritical = critical;
    obs.batteryLow = low;

    setExclusiveClass('battery', ['critical', 'low'], null);
    if (adaptive && low) html.classList.add('has-battery-low');
    if (adaptive && critical) html.classList.add('has-battery-critical');

    obs.batteryCharging = !!charging;
    toggleClass('has-battery-charging', obs.batteryCharging);
    recomputeDelivery();
  };

  const readHardwareStatus = () => {
    if ('deviceMemory' in navigator) {
      const memory = Number(navigator.deviceMemory);
      const memoryGB = Number.isFinite(memory) ? memory : null;
      const memoryCategory = categoriseDeviceMemory(memoryGB);
      obs.ramBucket = memoryGB;
      if (memoryCategory === null) delete obs.ramCategory;
      else obs.ramCategory = memoryCategory;
      setExclusiveClass('ram', RAM_CATEGORIES, memoryCategory);
    }

    if ('hardwareConcurrency' in navigator) {
      const hardwareConcurrency = Number(navigator.hardwareConcurrency);
      const cores = Number.isFinite(hardwareConcurrency) ? hardwareConcurrency : null;
      const cpuCategory = categoriseCpuCores(cores);
      obs.cpuBucket = cores;
      if (cpuCategory === null) delete obs.cpuCategory;
      else obs.cpuCategory = cpuCategory;
      setExclusiveClass('cpu', CPU_CATEGORIES, cpuCategory);
    }
  };

  const startObs = () => {
    if (hasStarted) return;
    hasStarted = true;

    html = document.documentElement;
    connection = navigator.connection;

    refreshConnectionStatus();
    if (
      observeChanges &&
      connection &&
      typeof connection.addEventListener === 'function'
    ) {
      connection.addEventListener('change', refreshConnectionStatus);
    }

    if ('getBattery' in navigator) {
      navigator.getBattery()
        .then(battery => {
          const refreshBattery = () => refreshBatteryStatus(battery);
          refreshBattery();

          if (observeChanges && typeof battery.addEventListener === 'function') {
            battery.addEventListener('levelchange', refreshBattery);
            battery.addEventListener('chargingchange', refreshBattery);
          }
        })
        .catch(() => { /* no-op */ });
    }

    readHardwareStatus();
    recomputeDeviceCapability();
  };

  if (document.prerendering === true) {
    const startAfterActivation = () => {
      document.removeEventListener('prerenderingchange', startAfterActivation);
      document.removeEventListener('visibilitychange', startWhenVisible);
      startObs();
    };
    const startWhenVisible = () => {
      if (document.visibilityState === 'visible') startAfterActivation();
    };

    document.addEventListener('prerenderingchange', startAfterActivation, { once: true });
    document.addEventListener('visibilitychange', startWhenVisible);
  } else {
    startObs();
  }

})();
