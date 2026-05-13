<img src=./demo/assets/logo.png alt="Obs.js" width=330 height=107>

# Obs.js: context‑aware web performance for everyone

_Meet your users where they are_

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
    "adaptive": true,
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

There are two main options for installing Obs.js depending on whether you want
fully adaptive mode, or analytics-only mode.

1. **Adaptive:** Must run early and inline; adds classes to `<html>` for CSS/JS
   adaptation later on.
2. **Analytics:** Can be deferred/external; does not add classes to `<html>`, but still
   populates `window.obs` for analytics purposes.

### Adaptive Installation

If you are using Obs.js for adaptation, it **MUST** be placed in an inline
`<script>` tag in the `<head>` of your document, before any other scripts,
stylesheets, or HTML that may depend on it.

Copy/paste the following as close to the top of your `<head>` as possible:

```html
<script>
  /*! Obs.js | (c) Harry Roberts, csswizardry.com | MIT */
;(()=>{const e=document.currentScript,i=window.obs&&window.obs.config||{},n=!1!==i.adaptive;if(n&&(!e||e.src||e.type&&"module"===e.type.toLowerCase())&&!1===/^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname))return void console.warn("[Obs.js] Skipping: must be an inline, classic <script> in <head>.",e?e.src?"src="+e.src:"type="+e.type:"type=module");const t=document.documentElement,{connection:o}=navigator;window.obs=window.obs||{};const a=!0===i.observeChanges,r=e=>{n&&e.forEach(e=>t.classList.remove(e))},c=e=>{n&&t.classList.add(e)},s=(e,i)=>{n&&t.classList.toggle(e,i)};let l=!1;const d=()=>{const e=window.obs||{},i="number"==typeof e.downlinkBucket?e.downlinkBucket:null;e.connectionCapability="low"===e.rttCategory&&null!=i&&i>=8?"strong":"high"===e.rttCategory||null!=i&&i<=5?"weak":"moderate";const n=!0===e.dataSaver||!0===e.batteryLow||!0===e.batteryCritical;e.conservationPreference=n?"conserve":"neutral";const t="weak"===e.connectionCapability||!0===e.dataSaver||!0===e.batteryCritical;e.deliveryMode="strong"!==e.connectionCapability||t||n?t?"lite":"cautious":"rich",e.canShowRichMedia="lite"!==e.deliveryMode,e.shouldAvoidRichMedia="lite"===e.deliveryMode,r(["strong","moderate","weak"].map(e=>`has-connection-capability-${e}`)),c(`has-connection-capability-${e.connectionCapability}`),r(["conserve","neutral"].map(e=>`has-conservation-preference-${e}`)),c(`has-conservation-preference-${e.conservationPreference}`),r(["rich","cautious","lite"].map(e=>`has-delivery-mode-${e}`)),c(`has-delivery-mode-${e.deliveryMode}`)},w=()=>{if(!o)return;const{saveData:e,rtt:i,downlink:n}=o;window.obs.dataSaver=!!e,s("has-data-saver",!!e);const t=(e=>Number.isFinite(e)?25*Math.ceil(e/25):null)(i);null!=t&&(window.obs.rttBucket=t);const a=(e=>Number.isFinite(e)?e<75?"low":e<=275?"medium":"high":null)(i);a&&(window.obs.rttCategory=a,r(["low","medium","high"].map(e=>`has-latency-${e}`)),c(`has-latency-${a}`));const l=(w=n,Number.isFinite(w)?Math.ceil(w):null);var w;if(null!=l){window.obs.downlinkBucket=l;const e=l<=5?"low":l>=8?"high":"medium";window.obs.downlinkCategory=e,r(["low","medium","high"].map(e=>`has-bandwidth-${e}`)),c(`has-bandwidth-${e}`)}"downlinkMax"in o&&(window.obs.downlinkMax=o.downlinkMax),d()},u=e=>{if(!e)return;const{level:i,charging:n}=e,t=Number.isFinite(i)?i<=.05:null;window.obs.batteryCritical=t;const o=Number.isFinite(i)?i<=.2:null;window.obs.batteryLow=o,r(["critical","low"].map(e=>`has-battery-${e}`)),o&&c("has-battery-low"),t&&c("has-battery-critical");const a=!!n;window.obs.batteryCharging=a,s("has-battery-charging",a),d()},h=()=>{if(!l){if(l=!0,w(),a&&o&&"function"==typeof o.addEventListener&&o.addEventListener("change",w),"getBattery"in navigator&&navigator.getBattery().then(e=>{u(e),a&&"function"==typeof e.addEventListener&&(e.addEventListener("levelchange",()=>u(e)),e.addEventListener("chargingchange",()=>u(e)))}).catch(()=>{}),"deviceMemory"in navigator){const i=Number(navigator.deviceMemory),n=Number.isFinite(i)?i:null;window.obs.ramBucket=n;const t=(e=n,Number.isFinite(e)?e<=1?"very-low":e<=2?"low":e<=4?"medium":"high":null);t&&(window.obs.ramCategory=t,r(["very-low","low","medium","high"].map(e=>`has-ram-${e}`)),c(`has-ram-${t}`))}var e;if("hardwareConcurrency"in navigator){const e=Number(navigator.hardwareConcurrency),i=Number.isFinite(e)?e:null;window.obs.cpuBucket=i;const n=(e=>Number.isFinite(e)?e<=2?"low":e<=5?"medium":"high":null)(i);n&&(window.obs.cpuCategory=n,r(["low","medium","high"].map(e=>`has-cpu-${e}`)),c(`has-cpu-${n}`))}(()=>{const e=window.obs||{},i=e.ramCategory,n=e.cpuCategory;let t="moderate";"high"!==i&&"medium"!==i||"high"!==n?("very-low"===i||"low"===i||"low"===n)&&(t="weak"):t="strong",e.deviceCapability=t,r(["strong","moderate","weak"].map(e=>`has-device-capability-${e}`)),c(`has-device-capability-${t}`)})()}};if("prerendering"in document&&!0===document.prerendering){const e=()=>{document.removeEventListener("visibilitychange",i),h()},i=()=>{"visible"===document.visibilityState&&e()};document.addEventListener("prerenderingchange",e,{once:!0}),document.addEventListener("visibilitychange",i)}else h()})();
//# sourceURL=obs.inline.js
</script>
```

Or download the [latest minified
version](https://github.com/csswizardry/Obs.js/releases/latest).

### Analytics Installation

If you only want to collect signals for analytics, disable adaptive mode
before Obs.js runs:

```html
<script>window.obs = { config: { adaptive: false } };</script>
<script src="/path/to/obs.js"></script>
```

With `adaptive: false`, Obs.js still populates `window.obs`, but it will not
add classes to the `<html>` element or require the strict inline-in-`<head>`
installation pattern.

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
| `config.adaptive`        | boolean                                           | Enable adaptive HTML classes           | **Default `true`**; set by you _before_ Obs.js runs                       | Set to `false` for analytics-only usage: Obs.js still populates `window.obs`, but it won’t mutate `<html>` or require inline `<head>` installation                           |
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
| `canShowRichMedia`       | boolean                                           | Convenience: `deliveryMode !== 'lite'` | Derived from `deliveryMode`                                               | Shorthand for ‘go big’                                                                                                                                                        |
| `shouldAvoidRichMedia`   | boolean                                           | Convenience: `deliveryMode === 'lite'` | Derived from `deliveryMode`                                               | Shorthand for ‘be frugal’                                                                                                                                                     |
| `batteryCritical`        | boolean \| null                                   | Battery ≤ 5%                           | Battery API                                                               | `true` when battery level is ≤ 5%; **also** `batteryLow === true`                                                                                                             |
| `batteryLow`             | boolean \| null                                   | Battery ≤ 20%                          | Battery API                                                               | `true` when battery level is ≤ 20%; `null` if unknown                                                                                                                         |
| `batteryCharging`        | boolean \| null                                   | On charge                              | Battery API                                                               | `null` if unknown                                                                                                                                                             |
| `ramBucket`              | number (GB)                                       | Coarse device RAM bucket               | `navigator.deviceMemory` (UA-rounded)                                     | Typical values: 0.5, 1, 2, 4, 8                                                                                                                                               |
| `ramCategory`            | `'very-low'` \| `'low'` \| `'medium'` \| `'high'` | RAM tier                               | From `ramBucket`                                                          | Adds `.has-ram-*` classes                                                                                                                                                     |
| `cpuBucket`              | number (cores)                                    | 1-core bucket (integer cores)          | `navigator.hardwareConcurrency`                                           | Prefer `cpuCategory` for segmentation                                                                                                                                         |
| `cpuCategory`            | `'low'` \| `'medium'` \| `'high'`                 | CPU tier                               | From cores (≤ 2 = low, 3–5 = medium, ≥ 6 = high)                          | Adds `.has-cpu-*` classes                                                                                                                                                     |
| `deviceCapability`       | `'strong'` \| `'moderate'` \| `'weak'`            | Device capability stance               | From `ramCategory` and `cpuCategory`                                      | **strong** when CPU is **high** **and** RAM is **medium/high**; **weak** when RAM is **very-low/low** **or** CPU is **low**; otherwise **moderate**. Adds matching classes.   |

## Unsupported Browsers

Most of these APIs are only available in Chromium browsers. This means you need
to decide how to handle notable absentees like iOS yourself: Obs.js does not
make opinionated decisions for you.

Your choices are:

1. Always ship the rich version to Safari, or;
2. Always ship the lite version to Safari.

You can write your `if`s and `else`s to accommodate either.

```js
if (window.obs?.shouldAvoidRichMedia === true) {
  // Serve lite version to slow supportive browsers.
} else {
  // Serve rich version to fast supportive browsers and Safari.
}
```

```js
if (window.obs?.canShowRichMedia === true) {
  // Serve rich version to fast supportive browsers.
} else {
  // Serve lite version to slow supportive browsers and Safari.
}
```

The choice is yours.
