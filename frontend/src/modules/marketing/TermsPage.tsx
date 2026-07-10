export function TermsPage() {
  const updated = 'July 10, 2026';

  return (
    <div className="pt-16">
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl font-black mb-3">Terms &amp; Conditions</h1>
          <p className="text-white/60 text-sm">Last updated: {updated}</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-sm text-blue-800">
            <strong>Summary:</strong> By using Jenix Community One, you agree to use it lawfully and responsibly. We provide the platform as-is with a 6-month free trial. After that, continued use requires a subscription.
          </div>

          {[
            {
              title: '1. Acceptance of Terms',
              content: `By accessing or using Jenix Community One ("Platform") at community.iotsoft.in, you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree to all Terms, do not use the Platform. These Terms apply to all users including society administrators, residents, staff and any other persons using the Platform.`,
            },
            {
              title: '2. Description of Service',
              content: `Jenix Community One is a multi-tenant Software-as-a-Service (SaaS) platform for society management. It provides features for managing residents, flats, vehicles, payments, access control, and related society operations. The Platform is operated by IOT Soft.

The Platform is provided "as is" and features may change over time. We reserve the right to add, modify or remove features at any time.`,
            },
            {
              title: '3. Free Trial & Subscription',
              content: `**6-Month Free Trial:** Each registered society receives 6 months of full platform access at no charge. No credit card is required for the trial.

**After Trial:** Continued use of the Platform after the free trial period requires a paid subscription. Pricing will be communicated to society administrators before the trial ends.

**Trial Conditions:** The trial is intended for genuine society use only. We reserve the right to terminate trial access if we find misuse, duplicate registrations, or bad-faith use.

**No Auto-Charge:** We will not automatically charge any payment method at the end of your trial. You choose to continue by requesting a subscription.`,
            },
            {
              title: '4. Account Responsibilities',
              content: `**Society Administrators** are responsible for:
- Maintaining the confidentiality of login credentials
- Ensuring that only authorized persons are given access
- Accuracy of all data entered into the Platform
- Compliance with applicable laws when managing resident data

**All Users** must not:
- Share login credentials with unauthorized persons
- Attempt to access other societies' data
- Use the Platform for any unlawful purpose
- Attempt to hack, penetrate or disrupt the Platform
- Upload malicious code, viruses or harmful content

You are responsible for all activities that occur under your account.`,
            },
            {
              title: '5. Data Ownership',
              content: `All society data entered into the Platform (residents, flats, vehicles, payments, etc.) remains the property of the respective society. IOT Soft acts as a data processor, not a data owner.

Upon account termination, we will provide you with an export of your data upon request (within 30 days). We will delete your data from our systems within 90 days of account closure, except as required by law.`,
            },
            {
              title: '6. Acceptable Use',
              content: `You agree to use the Platform only for lawful purposes. Prohibited uses include:
- Collecting or harvesting data from other societies or users
- Impersonating other users or society administrators
- Sending unsolicited communications (spam) through the Platform
- Uploading content that is defamatory, harassing, or illegal
- Using the Platform to facilitate any criminal activity
- Attempting to reverse engineer, decompile or copy the Platform's code`,
            },
            {
              title: '7. Privacy',
              content: `Your use of the Platform is also governed by our Privacy Policy, available at community.iotsoft.in/privacy. By using the Platform, you consent to the data practices described in the Privacy Policy.`,
            },
            {
              title: '8. Intellectual Property',
              content: `The Platform, including its design, code, algorithms, modules and documentation, is owned by IOT Soft and protected by intellectual property laws. You may not copy, reproduce, distribute or create derivative works without our express written permission.

Your society's data remains yours. IOT Soft's platform, code and branding remain ours.`,
            },
            {
              title: '9. Disclaimers & Limitation of Liability',
              content: `**No Warranty:** The Platform is provided "as is" without warranty of any kind. We do not guarantee uninterrupted, error-free operation.

**Limitation of Liability:** To the maximum extent permitted by law, IOT Soft shall not be liable for any indirect, incidental, special or consequential damages arising from your use of the Platform, including but not limited to loss of data, business interruption, or revenue loss.

**Maximum Liability:** Our total liability to you for any claim arising from use of the Platform shall not exceed the amount paid by you in the 12 months preceding the claim (or Rs. 1,000 if in the free trial period).`,
            },
            {
              title: '10. Indemnification',
              content: `You agree to indemnify and hold IOT Soft, its officers, directors, employees and agents harmless from any claims, losses, damages and expenses (including legal fees) arising from your use of the Platform, violation of these Terms, or infringement of any third-party rights.`,
            },
            {
              title: '11. Termination',
              content: `**By You:** You may terminate your society account at any time by contacting support@iotsoft.in.

**By Us:** We may suspend or terminate your access if you violate these Terms, engage in fraudulent activity, or fail to pay applicable subscription fees after the trial period.

**Effect of Termination:** Upon termination, your access to the Platform ends immediately. Data export can be requested within 30 days of termination.`,
            },
            {
              title: '12. Modifications to Terms',
              content: `We reserve the right to modify these Terms at any time. Material changes will be notified through the Platform. Continued use of the Platform after notification of changes constitutes your acceptance of the modified Terms.`,
            },
            {
              title: '13. Governing Law',
              content: `These Terms are governed by the laws of India. Any disputes arising from these Terms or use of the Platform shall be subject to the exclusive jurisdiction of courts in India. We encourage resolution of disputes through direct communication before legal proceedings.`,
            },
            {
              title: '14. Contact',
              content: `For questions about these Terms:
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
