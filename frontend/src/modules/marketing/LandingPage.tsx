import { Link } from 'react-router-dom';
import {
  ArrowRight, Building2, Users, Car, CreditCard, ShieldCheck, ClipboardList, Puzzle,
  Wrench, CalendarDays, Megaphone, BarChart3, MessageSquare, UserCheck, Package,
  AlertTriangle, Vote, FileText, Cpu, Activity, CheckCircle2, Star, Zap, Globe,
  Lock, Headphones, LayoutGrid, PawPrint, ChevronRight, BadgeCheck,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ─── Module definitions ────────────────────────────────────────────────────────
const MODULES = [
  { icon: Building2,    name: 'Society Core',      desc: 'Towers, floors, flats, residents & KYC tracking',        tag: 'Live',         color: 'bg-indigo-100 text-indigo-600'  },
  { icon: LayoutGrid,   name: 'Flat Management',   desc: 'Generate flats, manage occupancy, link residents',        tag: 'Live',         color: 'bg-blue-100 text-blue-600'     },
  { icon: Users,        name: 'Resident Registry', desc: 'Owner, tenant, family — with KYC physical tracking',     tag: 'Live',         color: 'bg-emerald-100 text-emerald-600'},
  { icon: Car,          name: 'Parking & Vehicles',desc: 'Vehicle registry, slot allocation, entry blacklisting',   tag: 'Live',         color: 'bg-sky-100 text-sky-600'       },
  { icon: PawPrint,     name: 'Pet Management',    desc: 'Register pets, vaccination records, aggression flags',    tag: 'Live',         color: 'bg-amber-100 text-amber-600'   },
  { icon: CreditCard,   name: 'Payments',          desc: 'Maintenance dues, receipts, payment history per flat',    tag: 'Live',         color: 'bg-teal-100 text-teal-600'     },
  { icon: ShieldCheck,  name: 'Access Control',    desc: 'IoT gate management, RFID & QR-based entry passes',      tag: 'Live',         color: 'bg-red-100 text-red-600'       },
  { icon: ClipboardList,name: 'Audit Trail',       desc: 'Every action logged — who, what, when, from where',      tag: 'Live',         color: 'bg-purple-100 text-purple-600' },
  { icon: UserCheck,    name: 'Visitor Management',desc: 'Pre-approve guests, OTP gate entry, visit logs',         tag: 'Coming Soon',  color: 'bg-cyan-100 text-cyan-600'     },
  { icon: Wrench,       name: 'Maintenance',       desc: 'Raise, assign and track repair requests end-to-end',     tag: 'Coming Soon',  color: 'bg-orange-100 text-orange-600' },
  { icon: CalendarDays, name: 'Amenity Booking',   desc: 'Clubhouse, gym, pool — online booking with time slots',  tag: 'Coming Soon',  color: 'bg-violet-100 text-violet-600' },
  { icon: Megaphone,    name: 'Announcements',     desc: 'Broadcast notices, events and emergency alerts to all',  tag: 'Coming Soon',  color: 'bg-rose-100 text-rose-600'     },
  { icon: MessageSquare,name: 'Complaints',        desc: 'Log complaints, track resolution, rate outcomes',        tag: 'Coming Soon',  color: 'bg-pink-100 text-pink-600'     },
  { icon: Vote,         name: 'Polls & Voting',    desc: 'Digital AGM voting, resolutions and society decisions',  tag: 'Coming Soon',  color: 'bg-fuchsia-100 text-fuchsia-600'},
  { icon: AlertTriangle,name: 'Emergency Alerts',  desc: 'One-tap SOS with auto-alert to all committee members',  tag: 'Coming Soon',  color: 'bg-red-100 text-red-700'       },
  { icon: Package,      name: 'Delivery Tracking', desc: 'Log parcels, notify residents, mark pickups',           tag: 'Coming Soon',  color: 'bg-lime-100 text-lime-600'     },
  { icon: FileText,     name: 'Document Vault',    desc: 'Store NOCs, agreements and society documents securely', tag: 'Live',         color: 'bg-slate-100 text-slate-600'   },
  { icon: BarChart3,    name: 'Fund & Audit',      desc: 'Society fund transparency with full audit reports',      tag: 'Live',         color: 'bg-green-100 text-green-600'   },
  { icon: Cpu,          name: 'Asset & AMC',       desc: 'Track society assets, AMC schedules & service history', tag: 'Coming Soon',  color: 'bg-zinc-100 text-zinc-600'     },
  { icon: Activity,     name: 'IoT Health',        desc: 'Monitor connected devices, cameras and sensor status',  tag: 'Live',         color: 'bg-emerald-100 text-emerald-700'},
];

// ─── Hero Section ────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white pt-16">
      {/* Decorative blobs */}
      <div className="absolute top-32 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl -translate-x-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-700/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-36">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium text-white/90 mb-8 backdrop-blur-sm">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>6 Months Free Trial — No Credit Card Required</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
            Smart Society Living{' '}
            <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              Starts Here
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            The complete digital platform for modern gated societies —<br className="hidden sm:block" />
            from resident registry to IoT access control, all in one place.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-purple-600 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/30"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-base hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              See Features <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
            {['6 months free, no card needed', 'Full setup assistance', 'IoT & mobile ready', '100% paperless society'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual — floating dashboard preview */}
        <div className="mt-20 relative max-w-5xl mx-auto">
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/70"/><div className="w-3 h-3 rounded-full bg-amber-500/70"/><div className="w-3 h-3 rounded-full bg-emerald-500/70"/></div>
              <div className="flex-1 bg-white/10 rounded-lg px-3 py-1 text-xs text-white/40 text-center">community.iotsoft.in</div>
            </div>
            {/* Mini dashboard grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Flats', value: '240', color: 'from-indigo-500 to-indigo-600' },
                { label: 'Residents', value: '680', color: 'from-emerald-500 to-teal-600' },
                { label: 'Vehicles', value: '312', color: 'from-blue-500 to-cyan-600' },
                { label: 'Pending KYC', value: '18', color: 'from-amber-500 to-orange-600' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 rounded-xl p-4 border border-white/10">
                  <p className={cn('text-2xl font-black bg-gradient-to-br bg-clip-text text-transparent', stat.color)}>{stat.value}</p>
                  <p className="text-xs text-white/50 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {[['Tower A', '80 flats', 'indigo'], ['Tower B', '80 flats', 'purple'], ['Tower C', '80 flats', 'blue']].map(([name, flats, c]) => (
                <div key={name} className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-${c}-500/30 flex items-center justify-center flex-shrink-0`}>
                    <Building2 className={`w-4 h-4 text-${c}-400`} />
                  </div>
                  <div><p className="text-xs font-semibold text-white">{name}</p><p className="text-xs text-white/40">{flats}</p></div>
                </div>
              ))}
            </div>
          </div>
          {/* Glow under the card */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-indigo-500/20 blur-2xl" />
        </div>
      </div>

      {/* Wave divider */}
      <div className="relative h-16 overflow-hidden">
        <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 64" fill="none">
          <path d="M0 64L1440 64L1440 32C1200 64 960 0 720 32C480 64 240 0 0 32L0 64Z" fill="rgb(248 250 252)" />
        </svg>
      </div>
    </section>
  );
}

// ─── Stats strip ─────────────────────────────────────────────────────────────
function StatsStrip() {
  const stats = [
    { value: '20+', label: 'Modules Available', icon: Puzzle },
    { value: '100%', label: 'Paperless Society', icon: FileText },
    { value: 'IoT', label: 'Hardware Ready', icon: Cpu },
    { value: '6 Mo', label: 'Free to Start', icon: BadgeCheck },
  ];
  return (
    <section className="bg-slate-50 py-12 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ value, label, icon: Icon }) => (
            <div key={label} className="text-center">
              <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-primary-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">{value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Problem section ─────────────────────────────────────────────────────────
function ProblemSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-primary-600 font-semibold text-sm uppercase tracking-widest mb-3">The Challenge</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Society Management Shouldn't Be This Hard</h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Sound familiar? Societies across India still struggle with the same problems every day.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              emoji: '📋',
              title: 'Endless Paperwork',
              desc: 'Resident registers, maintenance records, payment receipts — all in physical files that get lost, damaged, or never updated.',
              stat: 'Avg. 3 hrs/day wasted on manual records',
            },
            {
              emoji: '📞',
              title: 'Communication Chaos',
              desc: 'WhatsApp groups, missed calls, notice boards nobody reads. Society notices and emergency alerts get lost in the noise.',
              stat: 'Critical notices often reach less than 40% of residents',
            },
            {
              emoji: '🔒',
              title: 'Zero Transparency',
              desc: 'Who paid maintenance? Where did society funds go? What happened at the last AGM? Nobody can answer these questions.',
              stat: 'Fund disputes are the #1 reason committees resign',
            },
          ].map(({ emoji, title, desc, stat }) => (
            <div key={title} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-primary-200 hover:shadow-lg transition-all duration-300 group">
              <div className="text-4xl mb-4">{emoji}</div>
              <h3 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-primary-700 transition-colors">{title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">{desc}</p>
              <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">{stat}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <p className="text-xl font-bold text-slate-800">There's a better way. 👇</p>
        </div>
      </div>
    </section>
  );
}

// ─── Features section ─────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      icon: Building2,
      title: 'Complete Society Structure',
      desc: 'Build your society digitally — towers, floors, flats in seconds. Every unit is mapped, trackable and fully linked to residents.',
      color: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      icon: Users,
      title: 'Resident & KYC Management',
      desc: 'Register every resident, track KYC physically (no sensitive uploads), log move-ins, move-outs and member types accurately.',
      color: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      icon: Car,
      title: 'Vehicle & Parking Control',
      desc: 'Every vehicle registered, parking slots assigned, unauthorized vehicles flagged. Full control at the gate.',
      color: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: CreditCard,
      title: 'Payments & Receipts',
      desc: 'Collect maintenance dues, issue digital receipts, track payment history per flat. No more manual ledgers.',
      color: 'bg-teal-50',
      iconColor: 'text-teal-600',
    },
    {
      icon: ShieldCheck,
      title: 'IoT Access Control',
      desc: 'Smart gate management powered by hardware. RFID, QR codes and mobile-based entry for residents and staff.',
      color: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      icon: ClipboardList,
      title: 'Full Audit Trail',
      desc: 'Every action is logged — who did what, on which record, at what time. Complete accountability, always.',
      color: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-primary-600 font-semibold text-sm uppercase tracking-widest mb-3">Core Features</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">One Platform. Every Solution.</h2>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Everything your society needs to go fully digital — from the first resident record to the last maintenance receipt.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color, iconColor }) => (
            <div key={title} className="bg-white rounded-2xl p-7 border border-slate-100 hover:shadow-lg hover:border-primary-100 transition-all duration-300 group">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300', color)}>
                <Icon className={cn('w-6 h-6', iconColor)} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Modules showcase ─────────────────────────────────────────────────────────
function ModulesSection() {
  return (
    <section id="modules" className="py-24 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-indigo-300 font-semibold text-sm uppercase tracking-widest mb-3">Module Library</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Every Module Your Society Needs</h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto">Start with what you need today. Enable more as your society grows. No hidden charges.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODULES.map(({ icon: Icon, name, desc, tag, color }) => (
            <div
              key={name}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group backdrop-blur-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform', color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2',
                  tag === 'Live' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-white/50 border border-white/10'
                )}>
                  {tag === 'Live' ? '● Live' : 'Coming Soon'}
                </span>
              </div>
              <h3 className="text-white font-semibold text-sm mb-1.5">{name}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-slate-400 text-sm">
            <span className="text-emerald-400 font-semibold">● 10 modules live</span>
            <span className="mx-3 text-slate-600">·</span>
            <span className="text-white/50">10 coming in next releases</span>
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      icon: Globe,
      title: 'Register Your Society',
      desc: 'Fill a simple form — society name, address, contact. We set up your dedicated society space in minutes. Takes under 5 minutes.',
      cta: 'Request Demo →',
    },
    {
      num: '02',
      icon: Building2,
      title: 'Map Your Structure',
      desc: 'Add towers, set floor count, auto-generate flats. All units are numbered and structured exactly like your physical society.',
      cta: null,
    },
    {
      num: '03',
      icon: Users,
      title: 'Add Residents & Go Live',
      desc: 'Import residents flat-by-flat. Enable modules one by one. Your society is now fully digital — residents, vehicles, payments, and all.',
      cta: null,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-primary-600 font-semibold text-sm uppercase tracking-widest mb-3">Simple Setup</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Up and Running in 3 Steps</h2>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">No IT team needed. No complex configuration. Just a browser and 30 minutes of your time.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-primary-200 via-purple-200 to-primary-200" />

          {steps.map(({ num, icon: Icon, title, desc, cta }) => (
            <div key={num} className="relative text-center">
              <div className="relative inline-flex mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-primary-100 rounded-full text-xs font-black text-primary-600 flex items-center justify-center">{num.slice(1)}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
              {cta && (
                <Link to="/login" className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-primary-600 hover:text-primary-700">
                  {cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── For Everyone ─────────────────────────────────────────────────────────────
function ForEveryoneSection() {
  const personas = [
    {
      emoji: '🏛️',
      role: 'Society Committee',
      subtitle: 'Full control, zero paperwork',
      points: [
        'Complete resident & flat registry',
        'Transparent fund & payment tracking',
        'Digital audit trail for every decision',
        'Module-level control — enable what you need',
      ],
      gradient: 'from-indigo-600 to-indigo-700',
    },
    {
      emoji: '🏠',
      role: 'Residents & Owners',
      subtitle: 'Convenience at your fingertips',
      points: [
        'Know your flat\'s complete history',
        'View payment receipts any time',
        'Register vehicles, pets, family members',
        'Receive society notices instantly',
      ],
      gradient: 'from-emerald-600 to-teal-700',
    },
    {
      emoji: '🛡️',
      role: 'Security & Staff',
      subtitle: 'Simple, fast, accurate',
      points: [
        'Digital gate entry with IoT support',
        'Instant resident lookup by flat no.',
        'Vehicle & visitor registry at hand',
        'Emergency alert at one tap',
      ],
      gradient: 'from-purple-600 to-purple-700',
    },
  ];

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-primary-600 font-semibold text-sm uppercase tracking-widest mb-3">Built For Everyone</p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Works for Every Role in Your Society</h2>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">One platform, multiple views — each person sees exactly what they need.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {personas.map(({ emoji, role, subtitle, points, gradient }) => (
            <div key={role} className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300 group">
              <div className={cn('bg-gradient-to-br text-white p-8', gradient)}>
                <div className="text-4xl mb-3">{emoji}</div>
                <h3 className="text-xl font-bold">{role}</h3>
                <p className="text-white/70 text-sm mt-1">{subtitle}</p>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Trust section ────────────────────────────────────────────────────────────
function TrustSection() {
  const bullets = [
    { icon: Lock, title: 'Data Privacy First', desc: 'No sensitive document uploads. KYC is tracked by physical location reference only.' },
    { icon: Zap, title: 'Instant Setup', desc: 'Your society goes live in under 30 minutes. Our team assists with full onboarding.' },
    { icon: Headphones, title: 'Dedicated Support', desc: 'Real humans on WhatsApp and email. We don\'t disappear after you sign up.' },
    { icon: Globe, title: 'Any Device, Anywhere', desc: 'Mobile-responsive web app. Works on phone, tablet and desktop — no app download needed.' },
  ];

  return (
    <section className="py-20 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-900">Why Societies Choose Jenix</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bullets.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center p-6">
              <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-2">{title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ─────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-indigo-700 to-purple-800 py-24">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center text-white">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 border border-white/25 text-sm font-medium mb-8">
          <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
          Limited Time — 6 Months Completely Free
        </div>

        <h2 className="text-3xl sm:text-5xl font-black mb-6 leading-tight">
          Ready to Transform<br />Your Society?
        </h2>
        <p className="text-white/75 text-lg mb-10 max-w-xl mx-auto">
          Join societies that have gone fully digital. No credit card, no lock-in. Just a smarter way to manage your community.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-700 font-bold text-base hover:bg-slate-50 transition-colors shadow-xl"
          >
            Request Your Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="mailto:support@iotsoft.in"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/10 border border-white/25 text-white font-semibold text-base hover:bg-white/20 transition-colors"
          >
            Talk to Us First
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-sm text-white/60">
          {['6 months free trial', 'No credit card', 'Cancel any time', 'Full setup support'].map((t) => (
            <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div>
      <HeroSection />
      <StatsStrip />
      <ProblemSection />
      <FeaturesSection />
      <ModulesSection />
      <HowItWorksSection />
      <ForEveryoneSection />
      <TrustSection />
      <CTASection />
    </div>
  );
}
