const base = require('./app.json').expo;

module.exports = () => {
  const isPaid = process.env.APP_VARIANT === 'paid';
  const variant = isPaid ? 'paid' : 'trial';
  const icon = isPaid ? './assets/icon-paid.png' : './assets/icon-trial.png';

  return {
    ...base,
    name: isPaid ? 'الأفق المدفوعة' : 'الأفق التجريبية',
    slug: `alofok-${variant}`,
    scheme: `alofok-${variant}`,
    icon,
    ios: {
      ...base.ios,
      bundleIdentifier: `com.alofok.${variant}`
    },
    android: {
      ...base.android,
      package: `com.alofok.${variant}`,
      versionCode: 3,
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
      adaptiveIcon: {
        foregroundImage: icon,
        backgroundColor: isPaid ? '#061724' : '#06334a'
      }
    },
    extra: {
      ...base.extra,
      appVariant: variant
    }
  };
};
