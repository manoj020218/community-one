import { Link } from 'react-router-dom';
import { Building2, Cpu, Globe, Users, ArrowRight, Mail, MapPin } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-6">About Jenix Community One</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            We are building the future of society management in India — paperless, transparent, and IoT-powered.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-primary-600 font-semibold text-sm uppercase tracking-widest mb-3">Our Mission</p>
              <h2 className="text-3xl font-black text-slate-900 mb-4">Making Society Life Simpler, One Digital Step at a Time</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Jenix Community One is a product of <strong>IOT Soft</strong> — an Indian technology company focused on smart building solutions, IoT hardware, and society management platforms.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                We believe every gated community deserves a modern, digital operating system — not just spreadsheets and WhatsApp groups. Our platform is built for Indian societies with features that match how real societies work.
              </p>
              <p className="text-slate-600 leading-relaxed">
                From a single tower to large gated communities with hundreds of flats, Jenix scales with your society's needs.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: Building2, title: 'Society-First Design', desc: 'Every feature is designed around real society workflows — not generic SaaS templates.' },
                { icon: Cpu, title: 'IoT Native', desc: 'Built to connect with physical hardware — smart gates, RFID readers, cameras and sensors.' },
                { icon: Globe, title: 'Made in India', desc: 'Designed for Indian gated communities, RWAs, housing cooperatives and apartment complexes.' },
                { icon: Users, title: 'For Every Role', desc: 'Works for society admins, residents, security guards, accountants and facility managers.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Product Story */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-black text-slate-900 mb-6">The Product</h2>
          <div className="prose prose-slate max-w-none text-slate-600 space-y-4 text-sm leading-relaxed">
            <p>
              <strong className="text-slate-800">Jenix Community One</strong> is a multi-tenant SaaS platform that lets society committees, RWAs, and housing cooperatives manage their day-to-day operations completely online.
            </p>
            <p>
              The platform covers everything from structural management (towers, floors, flats) to resident management, vehicle tracking, pet registry, payments, receipts, and a full audit trail of every action.
            </p>
            <p>
              Future modules include visitor management, maintenance request tracking, amenity booking, complaint management, digital polls, and emergency alerts — making Jenix a true all-in-one society operating system.
            </p>
            <p>
              We also build and integrate IoT hardware — smart gate controllers, RFID readers, and access control devices — that connect directly to the platform for real-time entry management.
            </p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-black text-slate-900 mb-8 text-center">Get in Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Mail, title: 'Email Us', info: 'support@iotsoft.in', href: 'mailto:support@iotsoft.in' },
              { icon: Globe, title: 'Website', info: 'community.iotsoft.in', href: 'https://community.iotsoft.in' },
              { icon: MapPin, title: 'Location', info: 'India', href: null },
            ].map(({ icon: Icon, title, info, href }) => (
              <div key={title} className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <p className="font-semibold text-slate-900 text-sm mb-1">{title}</p>
                {href ? (
                  <a href={href} className="text-sm text-primary-600 hover:underline">{info}</a>
                ) : (
                  <p className="text-sm text-slate-600">{info}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-500 text-sm mb-4">Ready to take your society digital?</p>
            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 transition-colors">
              Request Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
