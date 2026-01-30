/**
 * Signup screen translations keyed by language code
 */

const signupTranslations: Record<string, Record<string, string>> = {
  en: {
    Profile: 'Profile',
    Username: 'Display Name',
    UniqueUsername: 'Unique Username (e.g., hemant_123)',
    UsernameAvailable: 'Username is available!',
    TrySuggestions: 'Try these:',
    Error: 'Error',
    AllFieldsAreMandatory: 'All fields are mandatory.',
    UsernameRequired: 'Please enter a valid username (at least 3 characters)',
    selectGender: 'Please select gender',
    selectGenderLabel: 'Select Gender',
    male: 'Male',
    female: 'Female',
    OthersLabel: 'Other',
    choosePhoto: 'Choose Photo',
    selectPhoto: 'Select option',
    takePhoto: 'Take Photo',
    chooseFromGallery: 'Choose from Gallery',
    cancel: 'Cancel',
    edit: 'Edit',
    userCancelledImage: 'User cancelled image picker',
    error: 'Error',
    failedTakePhoto: 'Failed to take photo',
    failedPickImage: 'Failed to pick image',
    failedUploadImage: 'Failed to upload image',
    invalidServerResponse: 'Invalid server response',
    Submit: 'Submit',
  },
  hi: {
    Profile: 'प्रोफाइल',
    Username: 'प्रदर्शन नाम',
    UniqueUsername: 'अद्वितीय उपयोगकर्ता नाम',
    UsernameAvailable: 'उपयोगकर्ता नाम उपलब्ध है!',
    TrySuggestions: 'इन्हें आज़माएं:',
    Error: 'त्रुटि',
    AllFieldsAreMandatory: 'सभी फ़ील्ड अनिवार्य हैं।',
    UsernameRequired: 'कृपया कम से कम 3 अक्षरों का उपयोगकर्ता नाम दर्ज करें',
    selectGender: 'कृपया लिंग चुनें',
    selectGenderLabel: 'लिंग चुनें',
    male: 'पुरुष',
    female: 'महिला',
    OthersLabel: 'अन्य',
    choosePhoto: 'फोटो चुनें',
    selectPhoto: 'विकल्प चुनें',
    takePhoto: 'फोटो लें',
    chooseFromGallery: 'गैलरी से चुनें',
    cancel: 'रद्द करें',
    edit: 'संपादित करें',
    Submit: 'जमा करें',
  },
};

export function getSignupTexts(lang: string): Record<string, string> {
  const map = signupTranslations[lang] || signupTranslations.en;
  return { ...signupTranslations.en, ...map };
}
