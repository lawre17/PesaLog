declare module 'react-native-get-sms-android' {
  interface SmsAndroidStatic {
    list(
      filter: string,
      fail: (error: string) => void,
      success: (count: number, smsList: string) => void
    ): void;

    autoSend(
      phoneNumber: string,
      message: string,
      fail: (error: string) => void,
      success: () => void
    ): void;
  }

  const SmsAndroid: SmsAndroidStatic;
  export default SmsAndroid;
}
