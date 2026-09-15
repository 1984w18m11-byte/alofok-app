const base = require('./app.json').expo;

module.exports = () => {
  const isPaid = process.env.APP_VARIANT === 'paid';
  const variant = isPaid ? 'paid' : 'trial';
  const icon = isPaid ? './assets/icon-paid.png' : './assets/icon-trial.png';
  const packageId = isPaid ? 'com.alofok.plus' : 'com.alofok.trial';
  const trialSounds = [
    './assets/adhan/beautiful_adhan.wav',
    './assets/adhan/adhan_andrewler.wav',
    './assets/adhan/adhan_aishatu98.wav',
    './assets/adhan/adhan_nigeria_isaac.wav',
    './assets/adhan/adhan_medina_ejaz215.wav',
    './assets/adhan/adhan_mecca_2013.wav'
  ];
  const paidSounds = ['./assets/adhan/beautiful_adhan.wav', './assets/adhan/adhan_andrewler.wav', './assets/adhan/adhan_maahur.wav'];
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
      versionCode: base.android.versionCode,
      blockedPermissions: ['android.permission.RECORD_AUDIO']
    },
    extra: {
      ...base.extra,
      appVariant: variant
    }
  };
};
