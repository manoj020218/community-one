export type KioskLang = 'en' | 'hi';

export const KIOSK_STRINGS: Record<KioskLang, Record<string, string>> = {
  en: {
    selectFlat: 'Select a flat',
    selectTower: 'Tower',
    searchFlat: 'Search flat number',
    newVisitor: 'New Visitor',
    takePhoto: 'Take Photo',
    photoPrompt: 'Take the guest’s photo',
    retake: 'Retake',
    next: 'Next',
    guestName: 'Guest Name',
    guestNamePrompt: 'What is the guest name?',
    purpose: 'Purpose of Visit',
    purposePrompt: 'What is the purpose of the visit?',
    mobile: 'Mobile Number',
    mobilePrompt: 'What is the guest mobile number?',
    holdToSpeak: 'Hold to Speak',
    listening: 'Listening…',
    typeInstead: 'Type instead',
    send: 'Send Request',
    sending: 'Sending…',
    waiting: 'Waiting for approval…',
    waitingSub: 'Please ask the guest to wait',
    accepted: 'Accepted',
    rejected: 'Rejected',
    expired: 'No Response',
    backToFlats: 'Back to Flats',
    voiceUnavailable: 'Voice input not available on this device — please type',
    queueTitle: 'In Progress',
    skip: 'Skip',
    cancel: 'Cancel',
  },
  hi: {
    selectFlat: 'फ्लैट चुनें',
    selectTower: 'टावर',
    searchFlat: 'फ्लैट नंबर खोजें',
    newVisitor: 'नया मेहमान',
    takePhoto: 'फोटो लें',
    photoPrompt: 'मेहमान की फोटो लें',
    retake: 'फिर से लें',
    next: 'आगे',
    guestName: 'मेहमान का नाम',
    guestNamePrompt: 'मेहमान का नाम क्या है?',
    purpose: 'आने का कारण',
    purposePrompt: 'आने का कारण क्या है?',
    mobile: 'मोबाइल नंबर',
    mobilePrompt: 'मेहमान का मोबाइल नंबर क्या है?',
    holdToSpeak: 'बोलने के लिए दबाएं',
    listening: 'सुन रहा है…',
    typeInstead: 'टाइप करें',
    send: 'भेजें',
    sending: 'भेजा जा रहा है…',
    waiting: 'स्वीकृति का इंतज़ार है…',
    waitingSub: 'कृपया मेहमान से इंतज़ार करने को कहें',
    accepted: 'स्वीकृत',
    rejected: 'अस्वीकृत',
    expired: 'कोई जवाब नहीं',
    backToFlats: 'फ्लैट सूची पर वापस',
    voiceUnavailable: 'इस डिवाइस पर आवाज़ इनपुट उपलब्ध नहीं है — कृपया टाइप करें',
    queueTitle: 'प्रगति में',
    skip: 'छोड़ें',
    cancel: 'रद्द करें',
  },
};

export function speak(text: string, lang: KioskLang): void {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch {
    // TTS is a convenience layer — silently no-op if unsupported/blocked
  }
}
