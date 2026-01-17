const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Expo Config Plugin to add SMS BroadcastReceiver to AndroidManifest.xml
 * This enables the app to receive SMS_RECEIVED broadcasts in real-time
 */
function withSmsReceiver(config) {
  return withAndroidManifest(config, async (config) => {
    const mainApplication = config.modResults.manifest.application?.[0];

    if (!mainApplication) {
      console.warn('withSmsReceiver: Could not find main application in AndroidManifest.xml');
      return config;
    }

    // Initialize receiver array if it doesn't exist
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    // Check if receiver already exists to avoid duplicates
    const existingReceiver = mainApplication.receiver.find(
      (r) => r.$?.['android:name'] === '.SmsReceiver'
    );

    if (!existingReceiver) {
      // Add the SMS broadcast receiver
      mainApplication.receiver.push({
        $: {
          'android:name': '.SmsReceiver',
          'android:enabled': 'true',
          'android:exported': 'true', // Required for Android 12+ to receive implicit broadcasts
          'android:permission': 'android.permission.BROADCAST_SMS', // Security: only system can send
        },
        'intent-filter': [
          {
            $: {
              'android:priority': '999', // High priority to receive before other apps
            },
            action: [
              {
                $: {
                  'android:name': 'android.provider.Telephony.SMS_RECEIVED',
                },
              },
            ],
          },
        ],
      });

      console.log('withSmsReceiver: Added SMS BroadcastReceiver to AndroidManifest.xml');
    } else {
      console.log('withSmsReceiver: SMS BroadcastReceiver already exists');
    }

    return config;
  });
}

module.exports = withSmsReceiver;
