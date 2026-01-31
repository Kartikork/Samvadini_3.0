/**
 * Header translations
 */

const headerTranslations: Record<string, Record<string, string>> = {
  en: {
    HolSec: 'Please hold for three seconds',
    NoEmAdded: 'No Emergency Contact is added yet!',
    Dangerlog: 'I am in danger.',
    sosmsg: 'SOS! Emergency message sent to your emergency contacts.',
    hdstill: 'Hold still!',
    soscount: 'SOS Message sending in ',
    sent: 'Sent',
    sosModalMessage: 'SOS',
    sos: 'SOS',
    AddEM: 'Add Emergency Contact',
    cancel: 'Cancel',
    ok: 'OK',
    starredMessage: 'Starred Messages',
    newBroadcast: 'New Broadcast',
    settings: 'Settings',
    analysisReport: 'Analysis Report',
    importChat: 'Import Chat',
    status: 'Status',
    logout: 'Logout',
  },
  hi: {
    HolSec: 'कृपया तीन सेकंड तक दबाए रखें',
    NoEmAdded: 'अभी तक कोई आपातकालीन संपर्क नहीं जोड़ा गया है!',
    Dangerlog: 'मैं खतरे में हूं।',
    sosmsg: 'SOS! आपातकालीन संदेश आपके आपातकालीन संपर्कों को भेजा गया।',
    hdstill: 'स्थिर रहें!',
    soscount: 'SOS संदेश भेजा जा रहा है ',
    sent: 'भेजा गया',
    sosModalMessage: 'SOS',
    sos: 'SOS',
    AddEM: 'आपातकालीन संपर्क जोड़ें',
    cancel: 'रद्द करें',
    ok: 'ठीक है',
    starredMessage: 'तारांकित संदेश',
    newBroadcast: 'नया प्रसारण',
    settings: 'सेटिंग्स',
    analysisReport: 'विश्लेषण रिपोर्ट',
    importChat: 'चैट आयात करें',
    logout: 'लॉगआउट',
  },
};

export function getHeaderTexts(lang: string): Record<string, string> {
  const map = headerTranslations[lang] || headerTranslations.en;
  return { ...headerTranslations.en, ...map };
}
