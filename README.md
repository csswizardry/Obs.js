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
| `.has-bandwidth-low`                    | Low estimated bandwidth  | `downlinkBucket ≤ 5` (1 Mbps buckets via `Math.ceil`)           |
| `.has-bandwidth-high`                   | High estimated bandwidth | `downlinkBucket ≥ 8` (6–7 is a dead zone → no class)            |
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
| `downlinkMax`            | number (Mbps)                      | Max estimated downlink (if exposed)           | `navigator.connection.downlinkMax`                             | Not used for Stances; informational only                                                   |
| `connectionCapability`   | `'strong' \| 'moderate' \| 'weak'` | Transport assessment                          | Derived from `rttCategory` and `downlinkBucket`                | Strong = low RTT **and** high BW; Weak = high RTT **or** low BW                            |
| `conservationPreference` | `'conserve' \| 'neutral'`          | Frugality signal                              | `dataSaver === true` **or** `batteryLow === true` → `conserve` | —                                                                                          |
| `deliveryMode`           | `'rich' \| 'cautious' \| 'lite'`   | How ‘heavy’ you should go                     | Derived from capability and conservation                       | Rich if **strong** and **not** conserving; Lite if **weak** or **conserve**; else Cautious |
| `canShowRichMedia`       | boolean                            | Convenience: `deliveryMode === 'rich'`        | Derived from `deliveryMode`                                    | Shorthand for ‘go big’                                                                     |
| `shouldAvoidRichMedia`   | boolean                            | Convenience: `deliveryMode === 'lite'`        | Derived from `deliveryMode`                                    | Shorthand for ‘be frugal’                                                                  |
| `batteryLow`             | boolean \| null                    | Battery ≤20%                                  | Battery API                                                    | `true` when battery level is ≤20%; `null` if unknown                                       |
| `batteryCritical`        | boolean \| null                    | Battery ≤5%                                   | Battery API                                                    | `true` when battery level is ≤5%; `true` in addition to `batteryLow`                       |
| `batteryCharging`        | boolean \| null                    | On charge                                     | Battery API                                                    | `null` if unknown                                                                          |
