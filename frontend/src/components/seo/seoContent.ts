const SITE_URL = 'https://community.iotsoft.in';

// Category-level competitive terms only (no brand names in visible copy —
// used solely in the non-visible <meta name="keywords"> tag, which Google
// itself does not use for ranking; see conversation notes on why).
const COMPETITOR_TERMS = ['MyGate alternative', 'NoBrokerHood alternative', 'ApnaComplex alternative', 'ADDA society software alternative'];

export const LANDING_KEYWORDS = [
  'society management software', 'apartment management software India', 'housing society management system',
  'gated community management software', 'RWA management software', 'flat management software',
  'resident management app', 'digital society management platform India', 'society app for residents',
  'online maintenance payment society', 'society maintenance collection software', 'society billing and receipt software',
  'visitor management system for apartments', 'gate visitor management app', 'vehicle and parking management society',
  'pet registration society app', 'KYC management housing society', 'audit trail society management software',
  'IoT gate access control software', 'smart gate management system India', 'RFID gate access society',
  'boom barrier integration software', 'boom barrier installer platform', 'QR code gate entry system',
  'society app for security guards', 'guard kiosk app', 'apartment complex software India',
  'housing cooperative management software', 'PropTech software India', 'free society management software India',
  ...COMPETITOR_TERMS,
];

export const ABOUT_KEYWORDS = [
  'about Jenix Community One', 'IOT Soft society software', 'IoT company India', 'smart building technology company India',
  'PropTech startup India', 'made in India society management software', 'IoT hardware integration partner',
  'IoT gate barrier technology company', 'smart society automation company',
];

export const ONBOARD_KEYWORDS = [
  'register housing society online', 'society management free trial', 'society onboarding software',
  'apartment society registration India', 'RWA online registration', 'sign up society management app',
  'start free society software', 'new society digital setup', 'society management demo India',
];

export const PRIVACY_KEYWORDS = [
  'privacy policy society management app', 'resident data protection India', 'DPDP Act compliance society software',
  'society app data security',
];

export const TERMS_KEYWORDS = [
  'terms of service Jenix Community One', 'society management software agreement', 'SaaS terms and conditions India',
];

export const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Jenix Community One',
  url: SITE_URL,
  logo: `${SITE_URL}/pwa-512x512.png`,
  parentOrganization: { '@type': 'Organization', name: 'IOT Soft' },
  email: 'support@iotsoft.in',
  areaServed: 'IN',
};

export const SOFTWARE_APPLICATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Jenix Community One',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description: 'Digital society management platform for Indian gated communities, apartment complexes and RWAs — resident registry, visitor management, maintenance billing and IoT gate access control.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  audience: {
    '@type': 'Audience',
    audienceType: 'Housing societies, RWAs, apartment residents, society committees, security staff, IoT gate hardware installers',
  },
};
