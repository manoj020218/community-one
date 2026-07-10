import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { Building2, Menu, X, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Modules', href: '/#modules' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'About', href: '/about' },
];

export function MarketingLayout() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#')) {
      e.preventDefault();
      setMobileOpen(false);
      const id = href.slice(2);
      if (window.location.pathname !== '/') {
        navigate('/');
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      setMobileOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-purple-600 rounded-lg flex items-center justify-center shadow-glow">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className={cn('text-sm font-bold leading-tight', scrolled ? 'text-slate-900' : 'text-white')}>Jenix Community</p>
                <p className={cn('text-xs leading-tight', scrolled ? 'text-slate-500' : 'text-white/70')}>Society Management</p>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleAnchor(e, link.href)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    scrolled ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-white/80 hover:text-white hover:bg-white/10'
                  )}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* CTAs */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <Link to="/dashboard" className="flex items-center gap-1.5 text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                  Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <>
                  <Link to="/login" className={cn('text-sm font-medium transition-colors', scrolled ? 'text-slate-600 hover:text-slate-900' : 'text-white/80 hover:text-white')}>
                    Login
                  </Link>
                  <Link to="/login" className="flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r from-primary-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity shadow-md">
                    Free Trial <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className={cn('md:hidden p-2 rounded-lg', scrolled ? 'text-slate-700' : 'text-white')}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} onClick={(e) => handleAnchor(e, link.href)}
                  className="block px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {link.label}
                </a>
              ))}
              <div className="border-t border-slate-100 pt-3 mt-3 space-y-2">
                <Link to="/login" className="block px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMobileOpen(false)}>Login</Link>
                <Link to="/login" className="block px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 text-white text-center hover:bg-primary-700" onClick={() => setMobileOpen(false)}>Start Free Trial</Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-sm">Jenix Community One</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs">
                The complete digital operating system for modern society management. Built by IOT Soft.
              </p>
              <p className="mt-4 text-xs text-slate-500">© {new Date().getFullYear()} IOT Soft. All rights reserved.</p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                {[['Features', '/#features'], ['Modules', '/#modules'], ['How It Works', '/#how-it-works'], ['Request Trial', '/login']].map(([label, href]) => (
                  <li key={label}><a href={href} className="hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Legal & Info</h4>
              <ul className="space-y-2 text-sm">
                {[['About', '/about'], ['Privacy Policy', '/privacy'], ['Terms & Conditions', '/terms']].map(([label, href]) => (
                  <li key={label}><NavLink to={href} className="hover:text-white transition-colors">{label}</NavLink></li>
                ))}
                <li><a href="mailto:support@iotsoft.in" className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
