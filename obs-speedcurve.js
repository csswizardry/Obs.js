;(() => {
  const obs = window.obs;
  const addData = window.LUX && window.LUX.addData;

  if (obs === null || typeof obs !== 'object' || typeof addData !== 'function') {
    return;
  }

  const properties = [
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

  properties.forEach(property => {
    if (Object.prototype.hasOwnProperty.call(obs, property)) {
      addData.call(window.LUX, property, obs[property]);
    }
  });
})();
