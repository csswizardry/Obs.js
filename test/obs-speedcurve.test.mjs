import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../obs-speedcurve.js', import.meta.url), 'utf8');
const whitelist = [
  'dataSaver',
  'rttBucket',
  'rttCategory',
  'downlinkBucket',
  'downlinkCategory',
  'downlinkMax',
  'connectionCapability',
  'conservationPreference',
  'deliveryMode',
  'canShowRichMedia',
  'shouldAvoidRichMedia',
  'batteryCritical',
  'batteryLow',
  'batteryCharging',
  'ramBucket',
  'ramCategory',
  'cpuBucket',
  'cpuCategory',
  'deviceCapability'
];

function execute({ addData, obs, lux = true } = {}) {
  const calls = [];
  const window = {};
  if (obs !== undefined) window.obs = obs;
  if (lux) {
    window.LUX = {};
    if (addData !== null) {
      window.LUX.addData = addData || function (...args) {
        assert.equal(this, window.LUX);
        calls.push(args);
      };
    }
  }

  const beforeGlobals = Object.keys(window).sort();
  const context = vm.createContext({ window });
  vm.runInContext(source, context, { filename: 'obs-speedcurve.js' });
  return { afterGlobals: Object.keys(window).sort(), beforeGlobals, calls, window };
}

for (const scenario of [
  ['missing LUX', { lux: false, obs: {} }],
  ['non-callable addData', { addData: null, obs: {} }],
  ['missing Obs.js state', {}],
  ['null Obs.js state', { obs: null }],
  ['primitive Obs.js state', { obs: 'not-state' }]
]) {
  test(`${scenario[0]} is a silent no-op`, () => {
    const result = execute(scenario[1]);
    assert.deepEqual(result.calls, []);
    assert.deepEqual(result.afterGlobals, result.beforeGlobals);
  });
}

test('a complete snapshot is sent exactly once in canonical whitelist order', () => {
  const obs = Object.fromEntries([...whitelist].reverse().map((property, index) => [property, index]));
  const result = execute({ obs });
  assert.deepEqual(result.calls, whitelist.map(property => [property, obs[property]]));
});

test('only present own whitelisted properties are sent', () => {
  const inherited = { rttCategory: 'inherited', cpuBucket: 99 };
  const obs = Object.assign(Object.create(inherited), {
    config: { adaptive: false },
    deliveryMode: 'lite',
    unknown: 'ignored'
  });
  const result = execute({ obs });
  assert.deepEqual(result.calls, [['deliveryMode', 'lite']]);
});

test('present falsy values are preserved without coercion', () => {
  const obs = {
    dataSaver: false,
    rttBucket: 0,
    rttCategory: '',
    batteryCritical: null
  };
  const result = execute({ obs });
  assert.deepEqual(result.calls, [
    ['dataSaver', false],
    ['rttBucket', 0],
    ['rttCategory', ''],
    ['batteryCritical', null]
  ]);
});

test('execution is one-shot and does not observe later properties', () => {
  const obs = { dataSaver: false };
  const result = execute({ obs });
  obs.batteryLow = true;
  assert.deepEqual(result.calls, [['dataSaver', false]]);
});

test('the adapter does not mutate state or add globals, timers, or listeners', () => {
  const obs = { dataSaver: false, deviceCapability: 'moderate' };
  const beforeState = JSON.stringify(obs);
  const result = execute({ obs });
  assert.equal(JSON.stringify(obs), beforeState);
  assert.deepEqual(result.afterGlobals, result.beforeGlobals);
  assert.equal('setTimeout' in result.window, false);
  assert.equal('setInterval' in result.window, false);
  assert.equal('addEventListener' in result.window, false);
});
