# Obs.js

Obs.js uses the Navigator and Battery APIs to get contextual information about
your users’ connection strength and battery status.

You can use this data to adapt your site/app to their environment, or beacon the
data off to an analytics endpoint.

At its simplest, Obs.js will add a suite of classes to your `<html>` element,
e.g.:

```html
<html class="has-latency-low
             has-bandwidth-high
             has-battery-charging
             has-connection-capability-strong
             has-conservation-preference-neutral
             has-delivery-mode-rich">
```

This means you could do something like this:

```css
/**
 * Disable all animations and transitions if a user’s battery is below 5%.
 */
.has-battery-critical,
.has-battery-critical * {
  animation: none;
  transition: none;
}
```

Or this:

```css
body {
  background-image: url('hi-res.jpg');
}

/**
 * Show low-resolution images if the user can’t take rich media right now.
 */
.has-delivery-mode-lite body {
  background-image: url('lo-res.jpg');
}
```

It also exposes this, and more, information via the `window.obs` object:

```js
{
  "config": {
    "observeChanges": false
  },
  "dataSaver": false,
  "rttBucket": 50,
  "rttCategory": "low",
  "downlinkBucket": 10,
  "connectionCapability": "strong",
  "conservationPreference": "neutral",
  "deliveryMode": "rich",
  "canShowRichMedia": true,
  "shouldAvoidRichMedia": false,
  "batteryCritical": false,
  "batteryLow": false,
  "batteryCharging": true
}
```

This means you could do something like this:

```html
<!--
  - Fetch low-resolution poster/placeholder image regardless.
  -->
<link rel=preload as=image href=poster.jpg>

<div class=media-placeholder style="background-image: url(poster.jpg);">

  <script>

    const mediaPlaceholder = document.querySelector('.media-placeholder');

    if (window.obs && window.obs.canShowRichMedia) {
      // If we can show rich media, load the video with the poster image in place.
      const v = document.createElement('video');
      v.src = 'video.mp4';
      v.poster = 'poster.jpg';
      v.autoplay = true;
      v.muted = true;
      v.playsInline = true;
      v.setAttribute('controls', '');
      mediaPlaceholder.replaceChildren(v);
    } else {
      // If not, just show the poster image as an image element.
      const img = new Image();
      img.src = 'poster.jpg';
      img.alt = '';
      mediaPlaceholder.replaceChildren(img);
    }

  </script>

</div>
```

## Installation

Obs.js **MUST** be placed in an inline `<script>` tag in the `<head>` of your
document, before any other scripts, stylesheets, or HTML that may depend on it.

Copy/paste the following as close to the top of your `<head>` as possible:

```html
<script>
  /*! Obs.js 0.2.0 | (c) Harry Roberts, csswizardry.com | MIT */
  ;(()=>{const e=document.currentScript;if((!e||e.src||e.type&&"module"===e.type.toLowerCase())&&!1===/^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname))return void console.warn("[Obs.js] Skipping: must be an inline, classic <script> in <head>.",e?e.src?"src="+e.src:"type="+e.type:"type=module");const i=document.documentElement,{connection:t}=navigator;window.obs=window.obs||{};const a=!0===(window.obs&&window.obs.config||{}).observeChanges,o=()=>{const e=window.obs||{},t="number"==typeof e.downlinkBucket?e.downlinkBucket:null;e.connectionCapability="low"===e.rttCategory&&null!=t&&t>=8?"strong":"high"===e.rttCategory||null!=t&&t<=5?"weak":"moderate";const a=!0===e.dataSaver||!0===e.batteryLow||!0===e.batteryCritical;e.conservationPreference=a?"conserve":"neutral";const o="weak"===e.connectionCapability||!0===e.dataSaver||!0===e.batteryCritical;e.deliveryMode="strong"!==e.connectionCapability||o||a?o?"lite":"cautious":"rich",e.canShowRichMedia="rich"===e.deliveryMode,e.shouldAvoidRichMedia="lite"===e.deliveryMode,["strong","moderate","weak"].forEach(e=>{i.classList.remove(`has-connection-capability-${e}`)}),i.classList.add(`has-connection-capability-${e.connectionCapability}`),["conserve","neutral"].forEach(e=>{i.classList.remove(`has-conservation-preference-${e}`)}),i.classList.add(`has-conservation-preference-${e.conservationPreference}`),["rich","cautious","lite"].forEach(e=>{i.classList.remove(`has-delivery-mode-${e}`)}),i.classList.add(`has-delivery-mode-${e.deliveryMode}`)},n=()=>{if(!t)return;const{saveData:e,rtt:a,downlink:n}=t;window.obs.dataSaver=!!e,i.classList.toggle("has-data-saver",!!e);const s=(e=>Number.isFinite(e)?25*Math.ceil(e/25):null)(a);null!=s&&(window.obs.rttBucket=s);const r=(e=>Number.isFinite(e)?e<75?"low":e<=275?"medium":"high":null)(a);r&&(window.obs.rttCategory=r,["low","medium","high"].forEach(e=>i.classList.remove(`has-latency-${e}`)),i.classList.add(`has-latency-${r}`));const c=(l=n,Number.isFinite(l)?Math.ceil(l):null);var l;if(null!=c){window.obs.downlinkBucket=c;const e=c<=5?"low":c>=8?"high":"medium";window.obs.downlinkCategory=e,["low","medium","high"].forEach(e=>i.classList.remove(`has-bandwidth-${e}`)),i.classList.add(`has-bandwidth-${e}`)}"downlinkMax"in t&&(window.obs.downlinkMax=t.downlinkMax),o()};n(),a&&t&&"function"==typeof t.addEventListener&&t.addEventListener("change",n);const s=e=>{if(!e)return;const{level:t,charging:a}=e,n=Number.isFinite(t)?t<=.05:null;window.obs.batteryCritical=n;const s=Number.isFinite(t)?t<=.2:null;window.obs.batteryLow=s,["critical","low"].forEach(e=>i.classList.remove(`has-battery-${e}`)),s&&i.classList.add("has-battery-low"),n&&i.classList.add("has-battery-critical");const r=!!a;window.obs.batteryCharging=r,i.classList.toggle("has-battery-charging",r),o()};if("getBattery"in navigator&&navigator.getBattery().then(e=>{s(e),a&&"function"==typeof e.addEventListener&&(e.addEventListener("levelchange",()=>s(e)),e.addEventListener("chargingchange",()=>s(e)))}).catch(()=>{}),"deviceMemory"in navigator){const e=Number(navigator.deviceMemory),t=Number.isFinite(e)?e:null;window.obs.ramBucket=t;const a=(r=t,Number.isFinite(r)?r<=1?"very-low":r<=2?"low":r<=4?"medium":"high":null);a&&(window.obs.ramCategory=a,["very-low","low","medium","high"].forEach(e=>i.classList.remove(`has-ram-${e}`)),i.classList.add(`has-ram-${a}`))}var r;if("hardwareConcurrency"in navigator){const e=Number(navigator.hardwareConcurrency),t=Number.isFinite(e)?e:null;window.obs.cpuBucket=t;const a=(e=>Number.isFinite(e)?e<=2?"low":e<=5?"medium":"high":null)(t);a&&(window.obs.cpuCategory=a,["low","medium","high"].forEach(e=>i.classList.remove(`has-cpu-${e}`)),i.classList.add(`has-cpu-${a}`))}(()=>{const e=window.obs||{},t=e.ramCategory,a=e.cpuCategory;let o="moderate";"high"!==t&&"medium"!==t||"high"!==a?("very-low"===t||"low"===t||"low"===a)&&(o="weak"):o="strong",e.deviceCapability=o,["strong","moderate","weak"].forEach(e=>{i.classList.remove(`has-device-capability-${e}`)}),i.classList.add(`has-device-capability-${o}`)})()})();
  //# sourceURL=obs.inline.js
</script>
```

### Listen for Changes

If you have long-lived pages or a single-page app, you can instruct Obs.js to
listen for changes to the connection and battery status by setting the following
config:

```html
<script>window.obs = { config: { observeChanges: true } }</script>

<script>
  // Obs.js
</script>
```

The default is `false`, which means Obs.js will only run once on each page load.
This is sufficient for most non-SPA sites.

## Statuses and Stances

The information provided by Obs.js is split into two categories: **Statuses**
and **Stances**.

* A **Status** is a factual piece of information, such as whether the user has
  enabled Data Saver, or whether their battery is charging, or if they are on
  a high latency connection.
* A **Stance** is an opinion derived from Statuses. For example, if the user has
  enabled Data Saver or their battery is low, we might say they have
  a **conservation preference** of `conserve`, meaning they might prefer to save
  resources.

You can use either Statuses or Stances in your CSS or JavaScript.

## Available CSS Classes and JS Properties

Obs.js exposes the following classes under the following conditions:

| Class                                   | Meaning                  | Computed/derived from                                                                                                                       |
| --------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `.has-data-saver`                       | User enabled Data Saver  | `navigator.connection.saveData === true`                                                                                                    |
| `.has-battery-critical`                 | Battery ≤ 5%             | `battery.level ≤ 0.05` (added **alongside** `.has-battery-low`)                                                                             |
| `.has-battery-low`                      | Battery ≤ 20%            | `battery.level ≤ 0.2`                                                                                                                       |
| `.has-battery-charging`                 | On charge                | `battery.charging === true`                                                                                                                 |
| `.has-latency-low`                      | Low RTT                  | `rtt < 75ms`                                                                                                                                |
| `.has-latency-medium`                   | Medium RTT               | `75–275ms`                                                                                                                                  |
| `.has-latency-high`                     | High RTT                 | `> 275ms`                                                                                                                                   |
| `.has-bandwidth-low`                    | Low estimated bandwidth  | `downlinkCategory === 'low'` (i.e. `downlinkBucket ≤ 5`Mbps)                                                                                |
| `.has-bandwidth-medium`                 | Mid estimated bandwidth  | `downlinkCategory === 'medium'` (i.e. `downlinkBucket` 6–7Mbps)                                                                             |
| `.has-bandwidth-high`                   | High estimated bandwidth | `downlinkCategory === 'high'` (i.e. `downlinkBucket ≥ 8`Mbps)                                                                               |
| `.has-connection-capability-weak`       | Transport looks weak     | `rttCategory === 'high'` **or** `downlinkCategory === 'low'`                                                                                |
| `.has-connection-capability-moderate`   | Transport middling       | Anything not strong/weak                                                                                                                    |
| `.has-connection-capability-strong`     | Transport looks strong   | `rttCategory === 'low'` **and** `downlinkCategory === 'high'`                                                                               |
| `.has-conservation-preference-conserve` | Frugality signal present | `dataSaver === true` **or** `batteryLow === true`                                                                                           |
| `.has-conservation-preference-neutral`  | No frugality signal      | Battery isn’t low and Data Saver is not enabled                                                                                             |
| `.has-delivery-mode-lite`               | Be frugal/lightweight    | `connectionCapability === 'weak'` **or** `dataSaver === true` **or** `batteryCritical === true`                                             |
| `.has-delivery-mode-cautious`           | Be careful/middle weight | Otherwise (not `rich`/`lite`). E.g. `batteryLow === true` (without `dataSaver`/`batteryCritical`) or `connectionCapability === 'moderate'`. |
| `.has-delivery-mode-rich`               | Allow rich/heavy media   | `connectionCapability === 'strong'` **and** `dataSaver !== true` **and** `batteryCritical !== true`                                         |
| `.has-ram-very-low`                     | Very low RAM tier        | `ramCategory === 'very-low'` (typically `ramBucket ≤ 1`GB)                                                                                  |
| `.has-ram-low`                          | Low RAM tier             | `ramCategory === 'low'` (typically `ramBucket ≤ 2`GB and > 1)                                                                               |
| `.has-ram-medium`                       | Medium RAM tier          | `ramCategory === 'medium'` (typically `ramBucket ≤ 4`GB and > 2)                                                                            |
| `.has-ram-high`                         | High RAM tier            | `ramCategory === 'high'` (typically `ramBucket > 4`GB)                                                                                      |
| `.has-cpu-low`                          | Few logical cores        | `cpuCategory === 'low'` (≤ 2 cores)                                                                                                         |
| `.has-cpu-medium`                       | Moderate logical cores   | `cpuCategory === 'medium'` (3–5 cores)                                                                                                      |
| `.has-cpu-high`                         | Many logical cores       | `cpuCategory === 'high'` (≥ 6 cores)                                                                                                        |
| `.has-device-capability-weak`           | Hardware looks weak      | `cpuCategory === 'low'` **or** `ramCategory` is `'very-low'`/`'low'`                                                                        |
| `.has-device-capability-moderate`       | Hardware middling        | Anything not strong/weak                                                                                                                    |
| `.has-device-capability-strong`         | Hardware looks strong    | `cpuCategory === 'high'` **and** `ramCategory` is `'medium'` **or** `'high'`                                                                |

These classes are automatically added to the `<html>` element.

Obs.js also stores the following properties on the `window.obs` object:

| Property                 | Type                                              | Meaning                                | Computed/derived from                                                     | Notes                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `config.observeChanges`  | boolean                                           | Attach change listeners                | **Default `false`**; set by you _before_ Obs.js runs                      | Opt-in for SPAs or long-lived pages                                                                                                                                           |
| `dataSaver`              | boolean                                           | User enabled Data Saver                | `navigator.connection.saveData`                                           | —                                                                                                                                                                             |
| `rttBucket`              | number (ms)                                       | RTT bucketed to **ceil** 25ms          | `navigator.connection.rtt`                                                | Undefined if Connection API missing                                                                                                                                           |
| `rttCategory`            | `'low'` \| `'medium'` \| `'high'`                 | CrUX tri-bin                           | Derived from RTT (`<75`, `75–275`, `>275`)                                | Drives latency classes                                                                                                                                                        |
| `downlinkBucket`         | number (Mbps)                                     | Downlink bucketed to **ceil** 1Mbps    | `navigator.connection.downlink`                                           | Thresholds: `≤5`, `6–7`, `≥8`                                                                                                                                                 |
| `downlinkCategory`       | `'low'` \| `'medium'` \| `'high'`                 | Bandwidth category                     | From `downlinkBucket` (≤ 5 → low, 6–7 → medium, ≥ 8 → high)               | Mirrors `.has-bandwidth-*` classes                                                                                                                                            |
| `downlinkMax`            | number (Mbps)                                     | Max estimated downlink (if exposed)    | `navigator.connection.downlinkMax`                                        | Informational only                                                                                                                                                            |
| `connectionCapability`   | `'strong'` \| `'moderate'` \| `'weak'`            | Transport assessment                   | From `rttCategory` + `downlinkCategory` (low/high signals)                | Strong = low RTT **and** high BW; Weak = high RTT **or** low BW                                                                                                               |
| `conservationPreference` | `'conserve'` \| `'neutral'`                       | Frugality signal                       | `dataSaver === true` **or** `batteryLow === true`                         | —                                                                                                                                                                             |
| `deliveryMode`           | `'rich'` \| `'cautious'` \| `'lite'`              | How ‘heavy’ you should go              | From `connectionCapability`, `dataSaver`, `batteryLow`, `batteryCritical` | **rich** if strong and not (`dataSaver` or `batteryCritical`); **lite** if weak **or** `dataSaver` **or** `batteryCritical`; else **cautious** (e.g. `batteryLow`/`moderate`) |
| `canShowRichMedia`       | boolean                                           | Convenience: `deliveryMode === 'rich'` | Derived from `deliveryMode`                                               | Shorthand for ‘go big’                                                                                                                                                        |
| `shouldAvoidRichMedia`   | boolean                                           | Convenience: `deliveryMode === 'lite'` | Derived from `deliveryMode`                                               | Shorthand for ‘be frugal’                                                                                                                                                     |
| `batteryCritical`        | boolean \| null                                   | Battery ≤ 5%                           | Battery API                                                               | `true` when battery level is ≤ 5%; **also** `batteryLow === true`                                                                                                             |
| `batteryLow`             | boolean \| null                                   | Battery ≤ 20%                          | Battery API                                                               | `true` when battery level is ≤ 20%; `null` if unknown                                                                                                                         |
| `batteryCharging`        | boolean \| null                                   | On charge                              | Battery API                                                               | `null` if unknown                                                                                                                                                             |
| `ramBucket`              | number (GB)                                       | Coarse device RAM bucket               | `navigator.deviceMemory` (UA-rounded)                                     | Typical values: 0.5, 1, 2, 4, 8                                                                                                                                               |
| `ramCategory`            | `'very-low'` \| `'low'` \| `'medium'` \| `'high'` | RAM tier                               | From `ramBucket`                                                          | Adds `.has-ram-*` classes                                                                                                                                                     |
| `cpuBucket`              | number (cores)                                    | 1-core bucket (integer cores)          | `navigator.hardwareConcurrency`                                           | Prefer `cpuCategory` for segmentation                                                                                                                                         |
| `cpuCategory`            | `'low'` \| `'medium'` \| `'high'`                 | CPU tier                               | From cores (≤ 2 = low, 3–5 = medium, ≥ 6 = high)                          | Adds `.has-cpu-*` classes                                                                                                                                                     |
| `deviceCapability`       | `'strong'` \| `'moderate'` \| `'weak'`            | Device capability stance               | From `ramCategory` and `cpuCategory`                                      | **strong** when CPU is **high** **and** RAM is **medium/high**; **weak** when RAM is **very-low/low** **or** CPU is **low**; otherwise **moderate**. Adds matching classes.   |
