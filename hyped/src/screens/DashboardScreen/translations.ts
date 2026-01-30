/**
 * Simple dashboard translations keyed by language code
 */

export const dashboardTranslations: Record<string, Record<string, string>> = {
  en: {
    welcome: 'Welcome',
    myCountryMySamvadini: 'My Country, My Samvadini',
    globalCommunicator: 'Global Communicator',
    calls: 'Calls',
    chats: 'Chats',
    EvMang: 'Event Management',
    vocalLocal: 'Vocal for Local',
    smesHome: 'SMEs & MSME Home Services',
    transformFuture: 'Transform Your Future',
    jobs: 'Jobs',
    startups: 'Startups',
    govtSchemesShort: 'Government Schemes',
    women: 'Women empowerment, Parenting',
    farmersRural: 'Farmers & Rural Communities',
    gamezone: 'Game Zone',
    lrn: 'Learn Language',
    AddContact: 'Add Contact',
    AddGroup: 'Add Group',
    TemporaryId: 'Temporary Id',
    DailyPlanner: 'Daily Planner',
    AddPlan: 'Add Planner',
    AddReminder: 'Add Reminder',
    AddEmergency: 'Add Emergency',
  },
  hi: {
    welcome: 'स्वागत',
    calls: 'कॉल',
    chats: 'चैट',
    jobs: 'नौकरियां',
    startups: 'स्टार्टअप',
    govtSchemesShort: 'सरकारी योजनाएं',
    women: 'महिला सशक्तिकरण',
    farmersRural: 'किसान और ग्रामीण',
    gamezone: 'गेम जोन',
    lrn: 'भाषा सीखें',
    AddContact: 'संपर्क जोड़ें',
    AddGroup: 'समूह जोड़ें',
    TemporaryId: 'अस्थायी आईडी',
    DailyPlanner: 'दैनिक योजनाकार',
    AddPlan: 'योजना जोड़ें',
    AddReminder: 'अनुस्मारक जोड़ें',
    AddEmergency: 'आपातकाल जोड़ें',
    globalCommunicator: 'वैश्विक संचार',
    EvMang: 'कार्यक्रम प्रबंधन',
  },
};

function getTranslation(lang: string, key: string, fallback: string): string {
  const map = dashboardTranslations[lang] || dashboardTranslations.en;
  return map[key] ?? dashboardTranslations.en[key] ?? fallback;
}

export function getDashboardTexts(lang: string) {
  return {
    welcome: getTranslation(lang, 'welcome', 'Welcome'),
    globalCommunicator: getTranslation(lang, 'globalCommunicator', 'Global Communicator'),
    calls: getTranslation(lang, 'calls', 'Calls'),
    chats: getTranslation(lang, 'chats', 'Chats'),
    evMang: getTranslation(lang, 'EvMang', 'Event Management'),
    jobs: getTranslation(lang, 'jobs', 'Jobs'),
    startups: getTranslation(lang, 'startups', 'Startups'),
    govtSchemesShort: getTranslation(lang, 'govtSchemesShort', 'Government Schemes'),
    women: getTranslation(lang, 'women', 'Women empowerment, Parenting'),
    farmersRural: getTranslation(lang, 'farmersRural', 'Farmers & Rural Communities'),
    gameZone: getTranslation(lang, 'gamezone', 'Game Zone'),
    learn: getTranslation(lang, 'lrn', 'Learn Language'),
    addContact: getTranslation(lang, 'AddContact', 'Add Contact'),
    addGroup: getTranslation(lang, 'AddGroup', 'Add Group'),
    temporaryId: getTranslation(lang, 'TemporaryId', 'Temporary Id'),
    dailyPlanner: getTranslation(lang, 'DailyPlanner', 'Daily Planner'),
    addPlan: getTranslation(lang, 'AddPlan', 'Add Planner'),
    addReminder: getTranslation(lang, 'AddReminder', 'Add Reminder'),
    addEmergency: getTranslation(lang, 'AddEmergency', 'Add Emergency'),
  };
}
