import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../obs.js', import.meta.url), 'utf8');

class MockEventTarget {
  #listeners = new Map();

  addEventListener(type, callback, options = {}) {
    const listeners = this.#listeners.get(type) || [];
    listeners.push({ callback, once: options.once === true });
    this.#listeners.set(type, listeners);
  }

  removeEventListener(type, callback) {
    const listeners = this.#listeners.get(type) || [];
    this.#listeners.set(type, listeners.filter(listener => listener.callback !== callback));
  }

  dispatchEvent(event) {
    const type = typeof event === 'string' ? event : event.type;
    for (const listener of [...(this.#listeners.get(type) || [])]) {
      listener.callback.call(this, { type, target: this });
      if (listener.once) this.removeEventListener(type, listener.callback);
    }
  }

  listenerCount(type) {
    return (this.#listeners.get(type) || []).length;
  }
}

class MockClassList {
  values = new Set();
  mutations = 0;

  add(...classNames) {
    this.mutations += 1;
    classNames.forEach(className => this.values.add(className));
  }

  remove(...classNames) {
    this.mutations += 1;
    classNames.forEach(className => this.values.delete(className));
  }

  toggle(className, force) {
    this.mutations += 1;
    if (force === true) this.values.add(className);
    else if (force === false) this.values.delete(className);
    else if (this.values.has(className)) this.values.delete(className);
    else this.values.add(className);
    return this.values.has(className);
  }
}

const ownSnapshot = value => JSON.parse(JSON.stringify(value));
const sortedClasses = classList => [...classList.values].sort();
const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

function createTarget(properties = {}) {
  return Object.assign(new MockEventTarget(), properties);
}

function runObs({
  adaptive,
  battery,
  connection,
  currentScript = { src: '', type: '' },
  deviceMemory,
  hardwareConcurrency,
  hostname = 'example.com',
  initialObs,
  observeChanges,
  prerendering,
  visibilityState = 'hidden'
} = {}) {
  const classList = new MockClassList();
  const document = createTarget({ currentScript, documentElement: { classList }, visibilityState });
  if (prerendering !== undefined) document.prerendering = prerendering;

  const reads = { connection: 0, deviceMemory: 0, hardwareConcurrency: 0 };
  const navigator = {};

  if (connection !== undefined) {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      get() {
        reads.connection += 1;
        return connection;
      }
    });
  }

  if (battery !== undefined) navigator.getBattery = () => battery;

  if (deviceMemory !== undefined) {
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      get() {
        reads.deviceMemory += 1;
        return deviceMemory;
      }
    });
  }

  if (hardwareConcurrency !== undefined) {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      get() {
        reads.hardwareConcurrency += 1;
        return hardwareConcurrency;
      }
    });
  }

  const config = {};
  if (adaptive !== undefined) config.adaptive = adaptive;
  if (observeChanges !== undefined) config.observeChanges = observeChanges;
  const window = {};
  if (initialObs !== undefined) window.obs = initialObs;
  else if (Object.keys(config).length) window.obs = { config };

  const warnings = [];
  const context = vm.createContext({
    console: { warn: (...args) => warnings.push(args) },
    document,
    location: { hostname },
    navigator,
    window
  });
  vm.runInContext(source, context, { filename: 'obs.js' });

  return { classList, document, navigator, reads, warnings, window };
}

test('adaptive inline startup exposes coherent strong state and classes', () => {
  const connection = createTarget({ saveData: false, rtt: 50, downlink: 8, downlinkMax: 10 });
  const result = runObs({ connection, deviceMemory: 4, hardwareConcurrency: 8 });

  assert.deepEqual(ownSnapshot(result.window.obs), {
    dataSaver: false,
    rttBucket: 50,
    rttCategory: 'low',
    downlinkBucket: 8,
    downlinkCategory: 'high',
    downlinkMax: 10,
    connectionCapability: 'strong',
    conservationPreference: 'neutral',
    deliveryMode: 'rich',
    canShowRichMedia: true,
    shouldAvoidRichMedia: false,
    ramBucket: 4,
    ramCategory: 'medium',
    cpuBucket: 8,
    cpuCategory: 'high',
    deviceCapability: 'strong'
  });
  assert.deepEqual(sortedClasses(result.classList), [
    'has-bandwidth-high',
    'has-connection-capability-strong',
    'has-conservation-preference-neutral',
    'has-cpu-high',
    'has-delivery-mode-rich',
    'has-device-capability-strong',
    'has-latency-low',
    'has-ram-medium'
  ]);
});

test('analytics-only external startup collects state without classes or warnings', () => {
  const result = runObs({
    adaptive: false,
    connection: createTarget({ saveData: true, rtt: 75, downlink: 6 }),
    currentScript: { src: '/obs.js', type: '' }
  });

  assert.equal(result.window.obs.dataSaver, true);
  assert.equal(result.window.obs.rttCategory, 'medium');
  assert.equal(result.window.obs.deliveryMode, 'lite');
  assert.deepEqual(sortedClasses(result.classList), []);
  assert.equal(result.warnings.length, 0);
});

test('adaptive external startup on production warns once and exits', () => {
  const result = runObs({
    connection: createTarget({ saveData: false, rtt: 50, downlink: 8 }),
    currentScript: { src: 'https://example.com/obs.js', type: '' }
  });

  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0][0], /Skipping/);
  assert.equal(result.window.obs, undefined);
  assert.equal(result.reads.connection, 0);
});

for (const hostname of ['localhost', '127.0.0.1']) {
  test(`adaptive external startup is allowed on ${hostname}`, () => {
    const result = runObs({
      connection: createTarget({ saveData: false, rtt: 50, downlink: 8 }),
      currentScript: { src: '/obs.js', type: '' },
      hostname
    });
    assert.equal(result.warnings.length, 0);
    assert.equal(result.window.obs.rttCategory, 'low');
  });
}

test('adaptive external startup is allowed on browser-serialised IPv6 loopback', () => {
  const result = runObs({
    connection: createTarget({ saveData: false, rtt: 50, downlink: 8 }),
    currentScript: { src: '/obs.js', type: '' },
    hostname: '[::1]'
  });
  assert.equal(result.warnings.length, 0);
  assert.equal(result.window.obs.rttCategory, 'low');
});

test('observeChanges defaults off and opt-in refreshes connection idempotently', () => {
  const withoutObservation = createTarget({ saveData: false, rtt: 50, downlink: 8 });
  runObs({ connection: withoutObservation });
  assert.equal(withoutObservation.listenerCount('change'), 0);

  const connection = createTarget({ saveData: false, rtt: 50, downlink: 8 });
  const result = runObs({ connection, observeChanges: true });
  assert.equal(connection.listenerCount('change'), 1);

  connection.rtt = 300;
  connection.downlink = 4;
  connection.dispatchEvent('change');
  connection.dispatchEvent('change');
  assert.equal(result.window.obs.rttCategory, 'high');
  assert.equal(result.window.obs.downlinkCategory, 'low');
  assert.equal(result.window.obs.deliveryMode, 'lite');
  assert.equal(sortedClasses(result.classList).filter(name => name.startsWith('has-latency-')).length, 1);
  assert.equal(sortedClasses(result.classList).filter(name => name.startsWith('has-bandwidth-')).length, 1);
});

for (const [rtt, category] of [[0, 'low'], [74, 'low'], [75, 'medium'], [274, 'medium'], [276, 'high']]) {
  test(`RTT ${rtt}ms is categorised ${category}`, () => {
    const result = runObs({ connection: createTarget({ saveData: false, rtt, downlink: 6 }) });
    assert.equal(result.window.obs.rttCategory, category);
    assert(result.classList.values.has(`has-latency-${category}`));
  });
}

test('RTT 275ms is high and makes connection capability weak', () => {
  const result = runObs({ connection: createTarget({ saveData: false, rtt: 275, downlink: 8 }) });
  assert.equal(result.window.obs.rttCategory, 'high');
  assert.equal(result.window.obs.connectionCapability, 'weak');
  assert(result.classList.values.has('has-latency-high'));
});

for (const [downlink, bucket, category] of [
  [0, 0, 'low'], [5, 5, 'low'], [5.1, 6, 'medium'], [7, 7, 'medium'], [7.1, 8, 'high'], [8, 8, 'high']
]) {
  test(`downlink ${downlink}Mbps buckets to ${bucket} and categorises ${category}`, () => {
    const result = runObs({ connection: createTarget({ saveData: false, rtt: 100, downlink }) });
    assert.equal(result.window.obs.downlinkBucket, bucket);
    assert.equal(result.window.obs.downlinkCategory, category);
    assert(result.classList.values.has(`has-bandwidth-${category}`));
  });
}

for (const [level, critical, low] of [[0.05, true, true], [0.2, false, true], [0.21, false, false]]) {
  test(`battery level ${level} preserves inclusive thresholds`, async () => {
    const battery = createTarget({ level, charging: false });
    const result = runObs({ battery: Promise.resolve(battery) });
    await flushMicrotasks();
    assert.equal(result.window.obs.batteryCritical, critical);
    assert.equal(result.window.obs.batteryLow, low);
    assert.equal(result.classList.values.has('has-battery-critical'), critical);
    assert.equal(result.classList.values.has('has-battery-low'), low);
  });
}

test('observed battery events share the same refresh behaviour', async () => {
  const battery = createTarget({ level: 0.5, charging: false });
  const result = runObs({ battery: Promise.resolve(battery), observeChanges: true });
  await flushMicrotasks();
  assert.equal(battery.listenerCount('levelchange'), 1);
  assert.equal(battery.listenerCount('chargingchange'), 1);

  battery.level = 0.04;
  battery.charging = true;
  battery.dispatchEvent('levelchange');
  battery.dispatchEvent('chargingchange');
  assert.equal(result.window.obs.batteryCritical, true);
  assert.equal(result.window.obs.batteryLow, true);
  assert.equal(result.window.obs.batteryCharging, true);
  assert(result.classList.values.has('has-battery-charging'));
});

test('a rejected battery promise is silent and leaves other state intact', async () => {
  const result = runObs({
    battery: Promise.reject(new Error('denied')),
    connection: createTarget({ saveData: false, rtt: 50, downlink: 8 })
  });
  await flushMicrotasks();
  assert.equal(result.warnings.length, 0);
  assert.equal(result.window.obs.connectionCapability, 'strong');
  assert.equal('batteryLow' in result.window.obs, false);
});

for (const [deviceMemory, hardwareConcurrency, expected] of [
  [1, 8, 'weak'], [4, 8, 'strong'], [8, 5, 'moderate'], [8, 2, 'weak']
]) {
  test(`hardware ${deviceMemory}GB/${hardwareConcurrency} cores yields ${expected} device`, () => {
    const result = runObs({ deviceMemory, hardwareConcurrency });
    assert.equal(result.window.obs.deviceCapability, expected);
    assert(result.classList.values.has(`has-device-capability-${expected}`));
  });
}

test('missing optional APIs leaves raw and delivery state absent with moderate device', () => {
  const result = runObs();
  assert.deepEqual(ownSnapshot(result.window.obs), { deviceCapability: 'moderate' });
  assert.deepEqual(sortedClasses(result.classList), ['has-device-capability-moderate']);
});

test('delivery precedence covers conserve, cautious, lite, and rich', async () => {
  const rich = runObs({ connection: createTarget({ saveData: false, rtt: 50, downlink: 8 }) });
  assert.equal(rich.window.obs.deliveryMode, 'rich');

  const moderate = runObs({ connection: createTarget({ saveData: false, rtt: 100, downlink: 6 }) });
  assert.equal(moderate.window.obs.deliveryMode, 'cautious');

  const saver = runObs({ connection: createTarget({ saveData: true, rtt: 50, downlink: 8 }) });
  assert.equal(saver.window.obs.deliveryMode, 'lite');

  const battery = createTarget({ level: 0.2, charging: false });
  const lowBattery = runObs({
    battery: Promise.resolve(battery),
    connection: createTarget({ saveData: false, rtt: 50, downlink: 8 })
  });
  await flushMicrotasks();
  assert.equal(lowBattery.window.obs.conservationPreference, 'conserve');
  assert.equal(lowBattery.window.obs.deliveryMode, 'cautious');
});

test('a valid pre-existing state and config retain identity', () => {
  const config = { adaptive: false, observeChanges: true };
  const initialObs = { config, consumerValue: 42 };
  const result = runObs({
    connection: createTarget({ saveData: false, rtt: 50, downlink: 8 }),
    initialObs
  });
  assert.equal(result.window.obs, initialObs);
  assert.equal(result.window.obs.config, config);
  assert.equal(result.window.obs.consumerValue, 42);
});

test('prerender waits without reads or mutations, then starts exactly once and cleans listeners', () => {
  const connection = createTarget({ saveData: false, rtt: 50, downlink: 8 });
  const result = runObs({ connection, observeChanges: true, prerendering: true });

  assert.deepEqual(result.reads, { connection: 0, deviceMemory: 0, hardwareConcurrency: 0 });
  assert.equal(result.classList.mutations, 0);
  assert.equal(result.document.listenerCount('prerenderingchange'), 1);
  assert.equal(result.document.listenerCount('visibilitychange'), 1);

  result.document.prerendering = false;
  result.document.visibilityState = 'visible';
  result.document.dispatchEvent('visibilitychange');
  result.document.dispatchEvent('prerenderingchange');

  assert.equal(result.reads.connection, 1);
  assert.equal(connection.listenerCount('change'), 1);
  assert.equal(result.document.listenerCount('prerenderingchange'), 0);
  assert.equal(result.document.listenerCount('visibilitychange'), 0);
});

test('invalid observed connection values clear stale state and exclusive classes', () => {
  const connection = createTarget({ saveData: false, rtt: 50, downlink: 8 });
  const result = runObs({ connection, observeChanges: true });

  connection.rtt = Number.NaN;
  connection.dispatchEvent('change');
  assert.equal('rttBucket' in result.window.obs, false);
  assert.equal('rttCategory' in result.window.obs, false);
  assert.equal(sortedClasses(result.classList).some(name => name.startsWith('has-latency-')), false);
  assert.equal(result.window.obs.connectionCapability, 'moderate');

  connection.downlink = Number.POSITIVE_INFINITY;
  connection.dispatchEvent('change');
  assert.equal('downlinkBucket' in result.window.obs, false);
  assert.equal('downlinkCategory' in result.window.obs, false);
  assert.equal(sortedClasses(result.classList).some(name => name.startsWith('has-bandwidth-')), false);
  assert.equal(result.window.obs.connectionCapability, 'moderate');
  assert.equal(sortedClasses(result.classList).some(name => /-(?:null|undefined)$/.test(name)), false);
});

for (const initialObs of [null, 'occupied', 42, true]) {
  test(`malformed ${String(initialObs)} window.obs is replaced with usable state`, () => {
    const result = runObs({
      connection: createTarget({ saveData: false, rtt: 50, downlink: 8 }),
      initialObs
    });
    assert.equal(typeof result.window.obs, 'object');
    assert.equal(result.window.obs.connectionCapability, 'strong');
    assert.equal(sortedClasses(result.classList).some(name => /-(?:null|undefined)$/.test(name)), false);
  });
}
