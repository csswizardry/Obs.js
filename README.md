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
  /*! Obs.js | (c) Harry Roberts, csswizardry.com | MIT */
  ;(()=>{const e=document.currentScript;if((!e||e.src||e.type&&"module"===e.type.toLowerCase())&&!1===/^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname))return void console.warn("[Obs.js] Skipping: must be an inline, classic <script> in <head>.",e?e.src?"src="+e.src:"type="+e.type:"type=module");const t=document.documentElement,{connection:n}=navigator;window.obs=window.obs||{};const i=!0===(window.obs&&window.obs.config||{}).observeChanges,o=()=>{const e=window.obs||{},n="number"==typeof e.downlinkBucket?e.downlinkBucket:null;e.connectionCapability="low"===e.rttCategory&&null!=n&&n>=8?"strong":"high"===e.rttCategory||null!=n&&n<=5?"weak":"moderate";const i=!0===e.dataSaver||!0===e.batteryLow;e.conservationPreference=i?"conserve":"neutral",e.deliveryMode=i||"strong"!==e.connectionCapability?i||"weak"===e.connectionCapability?"lite":"cautious":"rich",e.canShowRichMedia="rich"===e.deliveryMode,e.shouldAvoidRichMedia="lite"===e.deliveryMode,["strong","moderate","weak"].forEach(e=>{t.classList.remove(`has-connection-capability-${e}`)}),t.classList.add(`has-connection-capability-${e.connectionCapability}`),["conserve","neutral"].forEach(e=>{t.classList.remove(`has-conservation-preference-${e}`)}),t.classList.add(`has-conservation-preference-${e.conservationPreference}`),["rich","cautious","lite"].forEach(e=>{t.classList.remove(`has-delivery-mode-${e}`)}),t.classList.add(`has-delivery-mode-${e.deliveryMode}`)},a=()=>{if(!n)return;const{saveData:e,rtt:i,downlink:a}=n;window.obs.dataSaver=!!e,t.classList.toggle("has-data-saver",!!e);const s=(e=>Number.isFinite(e)?25*Math.ceil(e/25):null)(i);null!=s&&(window.obs.rttBucket=s);const c=(e=>Number.isFinite(e)?e<75?"low":e<=275?"medium":"high":null)(i);c&&(window.obs.rttCategory=c,["low","medium","high"].forEach(e=>t.classList.remove(`has-latency-${e}`)),t.classList.add(`has-latency-${c}`));const r=(l=a,Number.isFinite(l)?Math.ceil(l):null);var l;if(null!=r){window.obs.downlinkBucket=r;const e=r<=5?"low":r>=8?"high":"medium";window.obs.downlinkCategory=e,["low","medium","high"].forEach(e=>t.classList.remove(`has-bandwidth-${e}`)),t.classList.add(`has-bandwidth-${e}`)}"downlinkMax"in n&&(window.obs.downlinkMax=n.downlinkMax),o()};a(),i&&n&&"function"==typeof n.addEventListener&&n.addEventListener("change",a);const s=e=>{if(!e)return;const{level:n,charging:i}=e,a=Number.isFinite(n)?n<=.05:null;window.obs.batteryCritical=a;const s=Number.isFinite(n)?n<=.2:null;window.obs.batteryLow=s,["critical","low"].forEach(e=>t.classList.remove(`has-battery-${e}`)),s&&t.classList.add("has-battery-low"),a&&t.classList.add("has-battery-critical");const c=!!i;window.obs.batteryCharging=c,t.classList.toggle("has-battery-charging",c),o()};"getBattery"in navigator&&navigator.getBattery().then(e=>{s(e),i&&"function"==typeof e.addEventListener&&(e.addEventListener("levelchange",()=>s(e)),e.addEventListener("chargingchange",()=>s(e)))}).catch(()=>{})})();
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

| Class                                   | Meaning                  | Computed/derived from                                           |
| --------------------------------------- | ------------------------ | --------------------------------------------------------------- |
| `.has-data-saver`                       | User enabled Data Saver  | `navigator.connection.saveData === true`                        |
| `.has-battery-low`                      | Battery ≤ 20%            | `battery.level ≤ 0.2`                                           |
| `.has-battery-critical`                 | Battery ≤ 5%             | `battery.level ≤ 0.05` (added **alongside** `.has-battery-low`) |
| `.has-battery-charging`                 | On charge                | `battery.charging === true`                                     |
| `.has-latency-low`                      | Low RTT                  | `rtt < 75ms`                                                    |
| `.has-latency-medium`                   | Medium RTT               | `75–275ms`                                                      |
| `.has-latency-high`                     | High RTT                 | `> 275ms`                                                       |
| `.has-bandwidth-low`                    | Low estimated bandwidth  | `downlinkBucket ≤ 5` (1Mbps buckets via `Math.ceil`)            |
| `.has-bandwidth-medium`                 | Mid estimated bandwidth  | `downlinkBucket 6–7`                                            |
| `.has-bandwidth-high`                   | High estimated bandwidth | `downlinkBucket ≥ 8`                                            |
| `.has-connection-capability-strong`     | Transport looks strong   | `latency = low` **and** `bandwidth = high`                      |
| `.has-connection-capability-moderate`   | Transport middling       | Anything not strong/weak                                        |
| `.has-connection-capability-weak`       | Transport looks weak     | `latency = high` **or** `bandwidth = low`                       |
| `.has-conservation-preference-conserve` | Frugality signal present | `dataSaver === true` **or** `batteryLow === true`               |
| `.has-conservation-preference-neutral`  | No frugality signal      | Battery isn’t low and Data Saver is not enabled                 |

These classes are automatically added to the `<html>` element.

Obs.js also stores the following properties on the `window.obs` object:

| Property                 | Type                               | Meaning                                       | Computed/derived from                                          | Notes                                                                                      |
| ------------------------ | ---------------------------------- | --------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `config.observeChanges`  | boolean                            | Whether Obs.js attaches change listeners      | **Default `false`**; set by you _before_ Obs.js runs           | Opt-in for SPAs or long-lived pages                                                        |
| `dataSaver`              | boolean                            | User enabled Data Saver                       | `navigator.connection.saveData`                                | —                                                                                          |
| `rttBucket`              | number (ms)                        | RTT bucketed to **ceil** 25 ms (e.g. 101→125) | `navigator.connection.rtt`                                     | Undefined if Connection API missing                                                        |
| `rttCategory`            | `'low' \| 'medium' \| 'high'`      | CrUX tri-bin: <75, 75–275, >275               | Derived from `rtt`                                             | Drives latency classes                                                                     |
| `downlinkBucket`         | number (Mbps)                      | Downlink bucketed to **ceil** 1 Mbps          | `navigator.connection.downlink`                                | Low/High thresholds: `≤5` / `≥8`                                                           |
| `downlinkCategory`       | `'low' \| 'medium' \| 'high'`      | Bandwidth category                            | Derived from `downlinkBucket` (≤5→low, 6–7→medium, ≥8→high)    | Mirrors `.has-bandwidth-*` classes                                                         |
| `downlinkMax`            | number (Mbps)                      | Max estimated downlink (if exposed)           | `navigator.connection.downlinkMax`                             | Not used for Stances; informational only                                                   |
| `connectionCapability`   | `'strong' \| 'moderate' \| 'weak'` | Transport assessment                          | Derived from `rttCategory` and `downlinkBucket`                | Strong = low RTT **and** high BW; Weak = high RTT **or** low BW                            |
| `conservationPreference` | `'conserve' \| 'neutral'`          | Frugality signal                              | `dataSaver === true` **or** `batteryLow === true` → `conserve` | —                                                                                          |
| `deliveryMode`           | `'rich' \| 'cautious' \| 'lite'`   | How ‘heavy’ you should go                     | Derived from capability and conservation                       | Rich if **strong** and **not** conserving; Lite if **weak** or **conserve**; else Cautious |
| `canShowRichMedia`       | boolean                            | Convenience: `deliveryMode === 'rich'`        | Derived from `deliveryMode`                                    | Shorthand for ‘go big’                                                                     |
| `shouldAvoidRichMedia`   | boolean                            | Convenience: `deliveryMode === 'lite'`        | Derived from `deliveryMode`                                    | Shorthand for ‘be frugal’                                                                  |
| `batteryLow`             | boolean \| null                    | Battery ≤20%                                  | Battery API                                                    | `true` when battery level is ≤20%; `null` if unknown                                       |
| `batteryCritical`        | boolean \| null                    | Battery ≤5%                                   | Battery API                                                    | `true` when battery level is ≤5%; `true` in addition to `batteryLow`                       |
| `batteryCharging`        | boolean \| null                    | On charge                                     | Battery API                                                    | `null` if unknown                                                                          |
