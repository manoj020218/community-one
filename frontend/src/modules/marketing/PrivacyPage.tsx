export function PrivacyPage() {
  const updated = 'July 10, 2026';

  return (
    <div className="pt-16">
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl font-black mb-3">Privacy Policy</h1>
          <p className="text-white/60 text-sm">Last updated: {updated}</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 prose prose-slate prose-sm max-w-none">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8 text-sm text-amber-800">
            <strong>Summary:</strong> We collect only what is necessary to run your society. We do not sell your data. All personal information is stored securely and accessible only to your society administrators.
          </div>

          {[
            {
              title: '1. Who We Are',
              content: `Jenix Community One ("Platform", "we", "us") is a society management SaaS product operated by IOT Soft. The platform is accessible at community.iotsoft.in and related subdomains. For questions about this policy, contact us at support@iotsoft.in.`,
            },
            {
              title: '2. Information We Collect',
              content: `We collect the following categories of information:

**Society & Structural Data:** Society name, address, tower names, floor configurations, flat numbers and occupancy status.

**Resident & Member Data:** Names, mobile numbers, email addresses, member type (owner/tenant/family), move-in/move-out dates. We do NOT collect Aadhaar, PAN, passport or any identity document scans — KYC compliance is tracked by recording the physical file location only.

**Vehicle & Pet Data:** Vehicle registration numbers, types, parking slots, pet names and breed information provided by society administrators.

**User Account Data:** Login email, hashed password (never stored in plain text), role, last login time.

**Usage Data:** Pages visited, actions taken, IP address, browser type, device type — used for security and audit logging only.

**Payment Records:** Payment amounts, dates, purposes and receipt information. We do NOT store credit/debit card numbers or banking credentials.`,
            },
            {
              title: '3. How We Use Your Information',
              content: `We use collected data to:
- Provide and operate the society management platform
- Authenticate users and maintain session security
- Generate audit trails of all society actions
- Send system notifications (OTPs, alerts) when enabled
- Provide customer support and respond to requests
- Improve and maintain platform performance
- Comply with applicable laws and regulations

We do NOT use your data for advertising, profiling or selling to third parties.`,
            },
            {
              title: '4. Data Sharing',
              content: `We share data only in these limited circumstances:
- **Within your society:** Society administrators can see resident, flat, vehicle and payment data for their own society only. Data is strictly tenant-isolated by societyId.
- **Service providers:** We use third-party hosting (VPS providers) and email services to operate the platform. These providers are bound by data processing agreements.
- **Legal requirements:** We may disclose data if required by law, court order or government authority.
- **No selling:** We do not sell, rent or trade personal information to any third party for any commercial purpose.`,
            },
            {
              title: '5. Data Retention',
              content: `We retain your data for as long as your society account is active. If you request account deletion, we will remove identifiable personal data within 30 days, while retaining anonymized aggregate data for platform analytics. Audit logs may be retained for up to 7 years for legal compliance purposes.`,
            },
            {
              title: '6. Data Security',
              content: `We implement industry-standard security measures including:
- HTTPS/TLS encryption for all data in transit
- Bcrypt hashing for all passwords (never stored in plain text)
- Role-based access control — each user sees only what their role permits
- JWT-based authentication with refresh token rotation
- IP-based audit logging of all administrative actions
- Regular security reviews and dependency updates

Despite our measures, no system is 100% secure. We encourage you to use strong passwords and report any security concerns immediately to support@iotsoft.in.`,
            },
            {
              title: '7. Your Rights',
              content: `You have the right to:
- **Access:** Request a copy of personal data we hold about you
- **Correction:** Request correction of inaccurate data
- **Deletion:** Request deletion of your personal data (subject to legal retention requirements)
- **Portability:** Request your data in a machine-readable format
- **Objection:** Object to processing of your data in certain circumstances

To exercise these rights, contact your society administrator or email support@iotsoft.in. We will respond within 30 days.`,
            },
            {
              title: '8. Cookies',
              content: `We use only essential cookies and localStorage for session management (authentication tokens, user preferences). We do not use advertising cookies, tracking pixels or third-party analytics cookies. No cookie consent banner is required since we use only strictly necessary cookies.`,
            },
            {
              title: '9. Children\'s Privacy',
              content: `Our platform is not intended for persons under 18 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us information, contact us immediately at support@iotsoft.in.`,
            },
            {
              title: '10. Changes to This Policy',
              content: `We may update this Privacy Policy from time to time. Material changes will be notified to society administrators via the platform notification system. Continued use of the platform after changes constitutes acceptance of the updated policy.`,
            },
            {
              title: '11. Contact',
              content: `For any privacy-related queries:
- **Email:** support@iotsoft.in
- **Product:** Jenix Community One by IOT Soft
- **Website:** community.iotsoft.in`,
            },
          ].map(({ title, content }) => (
            <div key={title} className="mb-8">
              <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
              <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{content}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
