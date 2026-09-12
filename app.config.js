const base = require('./app.json').expo;

module.exports = () => {
  const isPaid = process.env.APP_VARIANT === 'paid';
  const variant = isPaid ? 'paid' : 'trial';
  const icon = isPaid ? './assets/icon-paid.png' : './assets/icon-trial.png';
  const packageId = isPaid ? 'com.alofok.plus' : 'com.alofok.trial';
  const packageId = isPaid ? 'com.alofok.plus' : 'com.alofok.trial';

  return {
    ...base,
    name: isPaid ? 'الأفق بلس' : 'الأفق',
    slug: `alofok-${variant}`,
    scheme: isPaid ? 'alofok-plus' : 'alofok',
    icon,
    ios: {
      ...base.ios,
      bundleIdentifier: packageId
    },
    android: {
      ...base.android,
      package: packageId,
      versionCode: base.android.versionCode,
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
      adaptiveIcon: {
        foregroundImage: icon,
        backgroundColor: '#061724'
      }
    },
    extra: {
      ...base.extra,
      appVariant: variant
    }
  };
};
