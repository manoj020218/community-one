import { Link } from 'react-router-dom';
import {
  ArrowRight, ChevronRight, CheckCircle2, Star, ScanLine, Bell, Wallet, FileText,
  Building2, ShieldCheck, Users, DoorOpen, Camera, Home, Layers3, Receipt,
  MessageCircleQuestion, Sparkles, Lock, UserCheck, ClipboardList,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Seo } from '../../components/seo/Seo';
import { HOSTEL_KEYWORDS, HOSTEL_STRUCTURED_DATA } from '../../components/seo/seoContent';
import { ApkDownloadButton } from './ApkDownloadButton';

// ─── Feature grid — tagged honestly, same convention as the main landing page ──
const FEATURES = [
  { icon: ScanLine, name: 'Smart Gate Entry/Exit', desc: 'Works with U5-family biometric/face terminals — every entry and exit is logged automatically, no register, no guesswork', tag: 'Live', color: 'bg-indigo-100 text-indigo-600' },
  { icon: Camera, name: 'On-Demand Photo Verification', desc: 'For an audit or safety concern, pull up the exact snapshot for one specific entry — nothing is stored unless you ask for it', tag: 'Live', color: 'bg-red-100 text-red-600' },
  { icon: Building2, name: 'Multi-Hostel Management', desc: 'Own hostels in more than one city? Manage all of them from one login, one dashboard', tag: 'Live', color: 'bg-blue-100 text-blue-600' },
  { icon: Wallet, name: 'Rent & Deposit Tracking', desc: 'Digital lease terms per student, rent collection, security deposit refunds — no more notebook ledgers', tag: 'Live', color: 'bg-emerald-100 text-emerald-600' },
  { icon: Layers3, name: 'Rooms & Floors in Minutes', desc: 'Set up your building structure — blocks, floors, rooms — the same day you sign up', tag: 'Live', color: 'bg-sky-100 text-sky-600' },
  { icon: Users, name: 'Digital Student Records', desc: 'Every student, every guardian, every document — searchable, never lost, available from anywhere', tag: 'Live', color: 'bg-purple-100 text-purple-600' },
  { icon: UserCheck, name: 'Visitor Management', desc: 'Guard-verified visitor entry with instant approval requests — know who is on your premises, always', tag: 'Live', color: 'bg-cyan-100 text-cyan-600' },
  { icon: ClipboardList, name: 'Audit Trail', desc: 'Every action logged — who changed what, when, from where. Full accountability by default', tag: 'Live', color: 'bg-slate-100 text-slate-600' },
  { icon: Bell, name: 'Parent Entry/Exit Alerts', desc: 'The moment your child taps in or out at the gate, an alert reaches your phone — with a full history you can check any time in your own login', tag: 'Live', color: 'bg-amber-100 text-amber-600' },
  { icon: Receipt, name: 'Automated Fee Reminders', desc: 'WhatsApp reminders before rent is due, with a UPI payment link — so admins stop chasing payments by phone call', tag: 'Live', color: 'bg-orange-100 text-orange-600' },
  { icon: ShieldCheck, name: 'Curfew & Late-Return Alerts', desc: 'Set allowed hours; anything outside that window flags the warden automatically', tag: 'Coming Soon', color: 'bg-rose-100 text-rose-600' },
  { icon: Sparkles, name: 'Mess & Housekeeping', desc: 'Meal planning, attendance, and housekeeping task tracking', tag: 'Coming Soon', color: 'bg-fuchsia-100 text-fuchsia-600' },
];

const FAQS = [
  {
    q: 'How does the Smart Gate actually work?',
    a: 'A biometric/face-recognition terminal is installed at your hostel entrance. When a student taps in or scans their face, the device records the moment — Jenix picks that up and logs it against that student\'s profile automatically. No manual register, no guard writing names in a book.',
  },
  {
    q: 'Do I need to buy special hardware?',
    a: 'Yes, an access-control terminal at your gate (we support the widely available U5-family biometric/face terminals, with support for other brands on our roadmap). If you already own one, it likely works with minimal setup — talk to us and we\'ll confirm.',
  },
  {
    q: 'Will parents be notified when their child enters or leaves?',
    a: 'Yes — this is live. The moment a gate event is logged, we send an alert straight to the linked parent\'s phone. Parents also get their own login to check the full entry/exit history any time, not just react to the alert. If the app notification can\'t be delivered for some reason, it falls back to a WhatsApp message so the alert still reaches you.',
  },
  {
    q: 'Does a parent need to install a separate app?',
    a: 'No — the same Jenix app, just a different login. The hostel admin links a parent to their child\'s profile once; after that, the parent signs in and only ever sees their own child\'s information — never other students\' data.',
  },
  {
    q: 'I own hostels in more than one city — can I manage them all from one account?',
    a: 'Yes. Multi-hostel management is live today — one login, switch between properties, see everything from a single dashboard.',
  },
  {
    q: 'Is student and parent data safe?',
    a: 'Every account is isolated to your organisation — no cross-hostel data mixing, ever. Photos captured for gate verification are never stored on our servers by default; they stay on your own device and are only fetched, one at a time, if you explicitly request one for an audit.',
  },
  {
    q: 'What does it cost?',
    a: 'Start with a free trial — no credit card required. Pricing scales with the number of rooms/students you manage; talk to us for a plan that fits your hostel.',
  },
  {
    q: 'Can I try it before committing my whole hostel to it?',
    a: 'Yes — register free, set up your rooms and a handful of students, and see the whole flow end to end before rolling it out hostel-wide.',
  },
];

function Badge({ tag }: { tag: 'Live' | 'Coming Soon' }) {
  return (
    <span className={cn(
      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide',
      tag === 'Live' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
    )}>
      {tag}
    </span>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white pt-16">
      <div className="absolute top-32 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-700/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] sm:text-xs font-medium text-white/90 mb-6 sm:mb-8 backdrop-blur-sm whitespace-nowrap">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
            <span>Built for Hostels, PGs & Student Housing in India</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
            Know Your Child Is{' '}
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              Safe, Every Day
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            The hostel management platform that replaces the paper register with a Smart Gate —
            every entry and exit logged automatically, with an instant alert straight to a parent's phone,
            rooms and rent managed digitally, and one dashboard for every hostel you run.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link
              to="/onboard?type=hostel"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/30"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-base hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              See How It Works <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
            {['Free trial, no card needed', 'Works with your gate hardware', 'Instant parent alerts', 'Multi-hostel ready'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <ApkDownloadButton />
          </div>
        </div>

        {/* Hero visual — real Smart Gate terminal photo + live gate-event mockup card */}
        <div className="mt-20 grid md:grid-cols-2 gap-10 items-center max-w-4xl mx-auto">
          <div className="relative flex justify-center">
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
            <div className="relative bg-white rounded-3xl p-5 shadow-2xl shadow-indigo-950/50 border border-white/10">
              <img
                src="/images/u5-hostel-device.jpg"
                alt="Jenix Smart Gate face-recognition terminal used for hostel entry and exit tracking"
                className="w-48 sm:w-56 h-auto rounded-xl"
                width={340}
                height={765}
                loading="eager"
              />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <ScanLine className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-white/50">Main Gate — Smart Terminal</p>
                <p className="text-sm text-white font-medium">Live event just now</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ENTERED</span>
            </div>
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold flex-shrink-0">RJ</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">Riya Jain</p>
                <p className="text-white/50 text-xs">Room B-204 · Verified by face match</p>
              </div>
              <p className="text-white/70 text-sm font-mono">8:42 PM</p>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-emerald-300">
              <Bell className="w-3.5 h-3.5" />
              <span>Parent notified on their phone — instantly</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-primary-600 font-semibold text-sm mb-3 uppercase tracking-wide">The Real Problem</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-6 leading-tight">
              Your daughter moved to a new city.<br />You have no idea what her days look like.
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Thousands of parents send their children — often young women, living alone for the first time —
              to a hostel in a city they've never visited, run by people they've never met. The only "safety
              record" most hostels keep is a handwritten register at the gate, if that.
            </p>
            <p className="text-slate-600 leading-relaxed">
              For the hostel owner, it's just as hard: chasing rent by phone call, tracking who's in which room
              on paper, and no real way to prove — to a worried parent, or to yourself — exactly when a student
              came and went.
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
            <div className="space-y-4">
              {[
                'A parent calls asking "is she back yet?" and no one actually knows',
                'The gate register from three months ago is missing or unreadable',
                'Rent collection is a spreadsheet, a notebook, and a lot of phone calls',
                'A new warden has no idea who\'s supposed to be in which room',
              ].map((pain) => (
                <div key={pain} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-500 text-xs font-bold">✕</span>
                  </div>
                  <p className="text-sm text-slate-600">{pain}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { icon: ScanLine, title: 'Student taps in or scans their face', desc: 'At the Smart Gate terminal installed at your entrance — takes under two seconds' },
    { icon: DoorOpen, title: 'Entry or exit is logged automatically', desc: 'No register, no guard writing names — the moment is captured with a timestamp' },
    { icon: FileText, title: 'The record is instantly available', desc: 'Warden and admin can see it right away; searchable history, nothing gets lost' },
    { icon: Bell, title: 'Parents stay informed, instantly', desc: 'An alert reaches the parent\'s phone the moment it happens — with a searchable history always available in their own login' },
  ];
  return (
    <section id="how-it-works" className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary-600 font-semibold text-sm mb-3 uppercase tracking-wide">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">From gate to dashboard, in seconds</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={step.title} className="relative bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center mb-4">
                <step.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-bold text-primary-500 mb-1">STEP {i + 1}</p>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm leading-snug">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-primary-600 font-semibold text-sm mb-3 uppercase tracking-wide">Everything In One Platform</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Built for how hostels actually run</h2>
          <p className="text-slate-500">We tag every feature honestly — what's live today, and what's still on the roadmap.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.name} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', f.color)}>
                  <f.icon className="w-5 h-5" />
                </div>
                <Badge tag={f.tag as 'Live' | 'Coming Soon'} />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1.5">{f.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DigitalRecordsSection() {
  const points = [
    { icon: Lock, title: 'Never lost, never damaged', desc: 'No more registers ruined by monsoon damp or misplaced during a move' },
    { icon: FileText, title: 'Searchable in seconds', desc: 'Find any student\'s history instantly instead of flipping through months of pages' },
    { icon: Home, title: 'Available from anywhere', desc: 'Check occupancy or a student\'s record from your phone, not just the office register' },
    { icon: ShieldCheck, title: 'A real audit trail', desc: 'Every change is logged — who did what, when. A paper register can\'t say the same' },
  ];
  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-indigo-300 font-semibold text-sm mb-3 uppercase tracking-wide">Why Go Digital</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-4">The paper register was never built for this</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {points.map((p) => (
            <div key={p.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <p.icon className="w-5 h-5 text-indigo-300" />
              </div>
              <h3 className="font-semibold text-white text-sm mb-2">{p.title}</h3>
              <p className="text-xs text-white/60 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex w-12 h-12 items-center justify-center bg-primary-50 rounded-2xl mb-4">
            <MessageCircleQuestion className="w-6 h-6 text-primary-600" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Common Questions</h2>
        </div>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <div key={faq.q} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-2 text-sm">{faq.q}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
          Give parents peace of mind. Give yourself a system that works.
        </h2>
        <p className="text-slate-500 mb-8">Start free — set up your first hostel today, no credit card required.</p>
        <Link
          to="/onboard?type=hostel"
          className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg"
        >
          Start Free Trial <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

export function HostelLandingPage() {
  return (
    <div>
      <Seo
        title="Hostel Management Software India | Smart Gate & Parent Alerts | Jenix"
        description="Hostel and PG management software with smart gate entry/exit tracking, instant parent safety alerts, digital student records, rent management and multi-hostel support. Built for hostel owners and worried parents alike. Free trial."
        keywords={HOSTEL_KEYWORDS}
        structuredData={HOSTEL_STRUCTURED_DATA}
        path="/hostel"
      />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DigitalRecordsSection />
      <FaqSection />
      <FinalCtaSection />
    </div>
  );
}
