const base = require('./app.json').expo;

module.exports = () => {
  const isPaid = process.env.APP_VARIANT === 'paid';
  const variant = isPaid ? 'paid' : 'trial';
  const updateChannel = isPaid ? 'plus' : 'trial';
  const icon = isPaid ? './assets/icon-paid.png' : './assets/icon-trial.png';

  // Trial and Plus deliberately share one Android package so an approved Plus APK
  // can replace an installed Trial APK in place. The edition stays separated by
  // the baked APP_VARIANT and by non-overlapping Android versionCode ranges.
  const packageId = 'com.alofok.trial';
  const androidVersionCode = isPaid ? 2000107 : 1000107;

  const trialSounds = [
    './assets/adhan/beautiful_adhan.wav',
    './assets/adhan/adhan_andrewler.wav',
    './assets/adhan/adhan_aishatu98.wav',
    './assets/adhan/adhan_nigeria_isaac.wav',
    './assets/adhan/adhan_medina_ejaz215.wav',
    './assets/adhan/adhan_mecca_2013.wav'
  ];
  const paidSounds = trialSounds;
  const plugins = (base.plugins || []).map(plugin => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-notifications') {
      return [plugin[0], {...(plugin[1] || {}), sounds: isPaid ? paidSounds : trialSounds}];
    }
    return plugin;
  });

  return {
    ...base,
    name: isPaid ? 'الأفق بلس' : 'الأفق',
    slug: `alofok-${variant}`,
    scheme: isPaid ? 'alofok-plus' : 'alofok',
    icon,
    plugins,
    ios: {
      ...base.ios,
      bundleIdentifier: packageId
    },
    android: {
      ...base.android,
      package: packageId,
      versionCode: androidVersionCode,
      permissions: Array.from(new Set([...(base.android?.permissions || []), 'REQUEST_INSTALL_PACKAGES'])),
      blockedPermissions: ['android.permission.RECORD_AUDIO']
    },
    extra: {
      ...base.extra,
      appVariant: variant,
      updateChannel,
      androidVersionCode
    }
  };
};
