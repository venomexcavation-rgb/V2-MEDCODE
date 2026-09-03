import { NavLink, Outlet } from 'react-router-dom';
import { ScrollToTop } from './ScrollToTop';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/scenarios', label: 'Scenarios' },
  { to: '/performance', label: 'Performance' },
  { to: '/reference', label: 'Reference' },
];

export function Layout() {
  return (
    <div className="app-layout">
      <ScrollToTop />
      <nav className="app-nav">
        <div className="nav-brand">68W Training System</div>
        <div className="nav-links">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              end={item.to === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="training-notice">
        Training Use Only — This system simulates casualty-care scenarios for education and
        training. It is not intended to provide medical advice or direct treatment of real
        patients.
      </footer>
    </div>
  );
}
