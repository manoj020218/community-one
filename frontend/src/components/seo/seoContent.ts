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
  'society app for security guards', 'guard kiosk app', 'guard patrol software', 'guard patrol tracking app',
  'security guard round tracking', 'QR checkpoint patrol system', 'GPS guard patrol verification', 'apartment complex software India',
  'housing cooperative management software', 'PropTech software India', 'free society management software India',
  'staff attendance management society software', 'household staff access control app',
  'WhatsApp maintenance reminder software', 'family safety alert society app', 'know when family reaches home app',
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

export const HOSTEL_KEYWORDS = [
  'hostel management software India', 'hostel management system', 'PG management software', 'girls hostel management software',
  'boys hostel management software', 'college hostel software', 'student hostel app', 'hostel attendance software',
  'hostel gate entry system', 'smart gate hostel', 'biometric attendance hostel', 'hostel fee management software',
  'hostel rent management software', 'digital hostel register', 'paperless hostel management', 'multi hostel management software',
  'hostel owner software India', 'hostel safety software', 'parent notification hostel app', 'working women hostel management',
  'PG rent management app', 'hostel visitor management system', 'hostel warden software',
  'hostel entry exit alert for parents', 'app to know child reached hostel safely', 'real time hostel gate alert app',
  'hostel guard patrol app', 'hostel security round tracking',
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
  description: 'Digital society management platform for Indian gated communities, apartment complexes and RWAs — resident registry, visitor management, WhatsApp maintenance billing, staff & attendance tracking, family safety alerts, GPS-verified guard patrolling and IoT gate access control.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  audience: {
    '@type': 'Audience',
    audienceType: 'Housing societies, RWAs, apartment residents, society committees, security staff, IoT gate hardware installers',
  },
};

export const LANDING_STRUCTURED_DATA: Record<string, unknown>[] = [ORGANIZATION_SCHEMA, SOFTWARE_APPLICATION_SCHEMA];

export const HOSTEL_SOFTWARE_APPLICATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Jenix Hostel',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: `${SITE_URL}/hostel`,
  description: 'Hostel and PG management platform for India — smart gate entry/exit tracking with instant parent safety alerts, digital student records, room and rent management, GPS-verified guard patrolling, and multi-hostel support for owners.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  audience: {
    '@type': 'Audience',
    audienceType: 'Hostel owners, PG owners, wardens, hostel administrators, students, parents',
  },
};

export const HOSTEL_STRUCTURED_DATA: Record<string, unknown>[] = [ORGANIZATION_SCHEMA, HOSTEL_SOFTWARE_APPLICATION_SCHEMA];
