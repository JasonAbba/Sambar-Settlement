import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { BookOpen, History, Home, Plus, UtensilsCrossed, Users } from 'lucide-react';
import { cx } from '../lib/util';

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: Home, end: true },
  { to: '/split', label: 'Split Lunch', short: 'Split', icon: Plus },
  { to: '/menu', label: 'Menu', short: 'Menu', icon: BookOpen },
  { to: '/people', label: 'People', short: 'People', icon: Users },
  { to: '/history', label: 'Lunch History', short: 'History', icon: History },
];

// Mobile bottom bar order: Split sits in the middle as the primary action.
const MOBILE_ORDER = ['/', '/menu', '/split', '/history', '/people'];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-maroon-700 shadow-sm">
        <UtensilsCrossed className="h-5 w-5 text-mustard-300" />
        <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-cream-50 bg-leaf-500" />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-xl text-maroon-800">Sambar Settlement</div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta-500">Fair splits</div>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const inWizard = pathname.startsWith('/split');

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-cream-200 bg-cream-50 lg:flex">
        <div className="px-5 pb-4 pt-6">
          <Logo />
        </div>
        <div className="temple-border mx-5 opacity-60" />
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition',
                  isActive ? 'bg-maroon-700 text-cream-50 shadow-sm' : 'text-ink-700 hover:bg-cream-200',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="px-5 pb-5 text-xs leading-relaxed text-ink-400">Good food. Good company. Fair splits.</p>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 border-b border-cream-200/80 bg-cream-50/90 backdrop-blur lg:hidden pt-safe">
          <div className="flex h-14 items-center justify-between px-4">
            <NavLink to="/" aria-label="Dashboard">
              <Logo />
            </NavLink>
            <NavLink
              to="/people"
              className={({ isActive }) => cx('icon-btn', isActive && 'bg-maroon-50 text-maroon-700')}
              aria-label="People"
            >
              <Users className="h-5 w-5" />
            </NavLink>
          </div>
        </header>

        <main
          className={cx(
            'mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 lg:px-8 lg:pt-8',
            // leave room for the fixed bottom nav (and the wizard's action bar) + iOS home indicator
            inWizard ? 'pb-[calc(env(safe-area-inset-bottom)+112px)] lg:pb-32' : 'pb-[calc(env(safe-area-inset-bottom)+96px)] lg:pb-12',
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation (hidden in the Split wizard, which has its own action bar) */}
      <nav
        hidden={inWizard}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-cream-50/95 backdrop-blur lg:hidden pb-safe"
        aria-label="Main"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
          {MOBILE_ORDER.map((path) => {
            const item = NAV.find((n) => n.to === path)!;
            const Icon = item.icon;
            if (path === '/split') {
              return (
                <NavLink key={path} to={path} className="flex flex-1 flex-col items-center pb-1.5" aria-label="Split today's lunch">
                  {({ isActive }) => (
                    <>
                      <span
                        className={cx(
                          '-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-cream-50 shadow-lift transition',
                          isActive ? 'bg-leaf-600' : 'bg-maroon-700',
                        )}
                      >
                        <Plus className="h-7 w-7 text-cream-50" strokeWidth={2.6} />
                      </span>
                      <span className={cx('mt-0.5 text-[11px] font-bold', isActive ? 'text-leaf-700' : 'text-maroon-700')}>Split</span>
                    </>
                  )}
                </NavLink>
              );
            }
            return (
              <NavLink
                key={path}
                to={path}
                end={item.end}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition',
                    isActive ? 'text-maroon-700' : 'text-ink-400',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', isActive && 'bg-maroon-50')}>
                      <Icon className="h-5 w-5" />
                    </span>
                    {item.short}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
