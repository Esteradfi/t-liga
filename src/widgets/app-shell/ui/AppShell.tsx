import '../../../shared/styles/global.css';
import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  House,
  Trophy,
  Bot,
  Users,
  Ellipsis,
  ChartNoAxesCombined,
  Sparkles,
  History,
  Eye,
  Bell,
  Settings,
} from 'lucide-react';
import { useOverview } from '../../../entities/portfolio';
import { useSessionStore } from '../../../entities/session/model/store';
import { Modal, Button } from '../../../shared/ui';
import css from './shell.module.css';
const primary = [
  { to: '/', label: 'Главная', icon: House },
  { to: '/arena', label: 'Арена', icon: Trophy },
  { to: '/agent', label: 'Агент', icon: Bot },
  { to: '/squads', label: 'Сквад', icon: Users },
  { to: '/more', label: 'Ещё', icon: Ellipsis },
];
const extras = [
  { to: '/market', label: 'Рынок', icon: ChartNoAxesCombined },
  { to: '/season', label: 'Путь сезона', icon: Sparkles },
  { to: '/journal', label: 'История действий', icon: History },
  { to: '/watchlist', label: 'Наблюдаю', icon: Eye },
];
export function AppShell() {
  const navigate = useNavigate();
  const { data } = useOverview(),
    location = useLocation(),
    theme = useSessionStore((s) => s.theme);
  const [notifications, setNotifications] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!location.pathname.startsWith('/agent'))
      document.getElementById('main-content')?.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div id="app-phone-frame" className={css.shell}>
      <aside className={css.sidebar}>
        <Link className={css.brand} to="/">
          <i>Т</i>
          <b>Лига</b>
        </Link>
        <nav aria-label="Навигация">
          {primary.map(({ to, label, icon: Icon }) => (
            <NavLink
              end={to === '/'}
              key={to}
              to={to}
              className={({ isActive }) => `${css.navitem} ${isActive ? css.active : ''}`}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
          <div className={css.divider} />
          {extras.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${css.navitem} ${isActive ? css.active : ''}`}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={css.sidebarBottom}>
          <div className={css.seasonMini}>
            <b>Сезон 01</b>
            <span>{data?.season.daysLeft ?? 19} дней</span>
            <div>
              <span />
            </div>
            <small>Новая высота</small>
          </div>
          <Link to="/profile" className={css.user}>
            <span>
              {data?.user.avatar ? (
                <img src={data.user.avatar} alt="Аватар" />
              ) : (
                (data?.user.name || 'Артём').slice(0, 2)
              )}
            </span>
            <div>
              <b>{data?.user.name || 'Артём'}</b>
              <small>Мой профиль →</small>
            </div>
          </Link>
        </div>
      </aside>
      <div className={css.workspace}>
        <header className={css.header}>
          <Link to="/" className={css.mobilebrand}>
            <i>Т</i>
            <b>Лига</b>
          </Link>
          <span className={css.crumb}>Т-Лига</span>
          <div className={css.headerActions}>
            <span className={css.demo}>
              <i />
              Демо
            </span>
            <button aria-label="Уведомления" onClick={() => setNotifications(true)}>
              <Bell size={21} />
            </button>
            <Link aria-label="Настройки" to="/settings">
              <Settings size={21} />
            </Link>
          </div>
        </header>
        <main
          id="main-content"
          className={`${css.content} ${location.pathname.startsWith('/agent') ? css.chatContent : ''}`}
        >
          <Outlet />
        </main>
        <div className={css.bottomDock}>
          <nav className={css.bottomNav} aria-label="Нижняя навигация">
            {primary.map(({ to, label, icon: Icon }) => (
              <NavLink
                end={to === '/'}
                key={to}
                to={to}
                className={({ isActive }) => `${css.bottomItem} ${isActive ? css.active : ''}`}
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <Modal open={notifications} onOpenChange={setNotifications} title="Уведомления">
        <div className={css.notificationBubble}>↑ Ты поднялся на 12 позиций за день.</div>
        <div className={css.notificationBubble}>✧ Доступны четыре награды пути сезона.</div>
        <div className={css.notificationBubble}>⌁ В скваде свободно одно место.</div>
        <Button
          onClick={() => {
            setNotifications(false);
            navigate('/season');
          }}
        >
          Забрать награды
        </Button>
      </Modal>
    </div>
  );
}
