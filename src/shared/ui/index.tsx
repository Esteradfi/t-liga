import { useState, useRef, type ReactNode, type ButtonHTMLAttributes } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronRight, Inbox, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import s from './ui.module.css';
export { s };
export function Card({
  children,
  className = '',
  ...props
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`${s.card} ${className}`} {...props}>
      {children}
    </section>
  );
}
export function Button({
  children,
  variant = 'primary',
  small = false,
  full = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  small?: boolean;
  full?: boolean;
}) {
  return (
    <button
      {...props}
      className={`${s.button} ${variant === 'primary' ? '' : s[variant]} ${small ? s.small : ''} ${full ? s.full : ''} ${className}`}
    >
      {children}
    </button>
  );
}
export function ButtonLink({
  children,
  to,
  variant = 'primary',
  small = false,
  state,
}: {
  children: ReactNode;
  to: string;
  state?: unknown;
  variant?: 'primary' | 'secondary' | 'ghost';
  small?: boolean;
}) {
  return (
    <Link
      to={to}
      state={state}
      className={`${s.button} ${variant === 'primary' ? '' : s[variant]} ${small ? s.small : ''}`}
    >
      {children}
    </Link>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={s.heading}>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  scrollable = false,
}: {
  items: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
}) {
  return (
    <div className={`${s.tabs} ${scrollable ? s.scrollTabs : ''}`} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          className={s.tab}
          data-active={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = '',
  overlayClassName = '',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal
        container={
          typeof document !== 'undefined'
            ? document.getElementById('app-phone-frame') || undefined
            : undefined
        }
      >
        <Dialog.Overlay className={`${s.overlay} ${overlayClassName}`} />
        <Dialog.Content
          className={`${s.dialog} ${className}`}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus();
          }}
        >
          <Dialog.Title className={s.dialogTitle}>{title}</Dialog.Title>
          {description && (
            <Dialog.Description className={s.dialogDescription}>{description}</Dialog.Description>
          )}
          <Dialog.Close className={s.close} aria-label="Закрыть">
            ×
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Empty({
  title = 'Здесь пока ничего нет',
  text,
  action,
}: {
  title?: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <Inbox />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
export function Loading() {
  return <div aria-label="Загрузка" className={s.loading} />;
}
export function QueryError({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className={s.error} role="alert">
      {error instanceof Error ? error.message : 'Не удалось загрузить данные.'}
      {retry && (
        <Button variant="ghost" onClick={retry}>
          Повторить
        </Button>
      )}
    </div>
  );
}
export function Back({ to, label = 'Назад' }: { to: string; label?: string }) {
  return (
    <Link to={to} className={s.back}>
      <ArrowLeft size={15} />
      {label}
    </Link>
  );
}
export function ListRow({
  title,
  description,
  icon,
  action,
  to,
  right,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: () => void;
  to?: string;
  right?: ReactNode;
}) {
  const children = (
    <>
      {icon && <span className={s.icon}>{icon}</span>}
      <span className={s.grow}>
        <b>{title}</b>
        {description && <small>{description}</small>}
      </span>
      {right || <ChevronRight size={17} />}
    </>
  );
  return to ? (
    <Link to={to} className={s.listrow}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={action} className={s.listrow}>
      {children}
    </button>
  );
}
export function Chip({ children, yellow = false }: { children: ReactNode; yellow?: boolean }) {
  return <span className={`${s.chip} ${yellow ? s.yellow : ''}`}>{children}</span>;
}
export function TrendChart({
  height = 150,
  color = '#1aaf82',
  seed = 0,
  data,
}: {
  height?: number;
  color?: string;
  seed?: number;
  data?: { date: string; value: number }[];
}) {
  const points =
    data ||
    Array.from({ length: 28 }, (_, i) => ({
      date: i === 0 ? '19 окт' : i === 13 ? '28 окт' : i === 27 ? '7 ноя' : '',
      value: 100 + i * 1.3 + Math.sin(i * 2.8 + seed) * 2,
    }));
  return (
    <div style={{ height, minWidth: 0, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 12, right: 22, bottom: 2, left: 22 }}>
          <defs>
            <linearGradient id={`chart-${seed}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            ticks={[
              points[0]?.date,
              points[Math.floor(points.length / 2)]?.date,
              points[points.length - 1]?.date,
            ].filter(Boolean)}
            interval={0}
            tickFormatter={(v) =>
              String(v).includes('-')
                ? new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                : String(v)
            }
            tick={{ fontSize: 9, fill: '#959caa' }}
            height={23}
          />
          <YAxis hide domain={['dataMin', 'dataMax']} padding={{ top: 4, bottom: 4 }} />
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 10,
              fontSize: 12,
            }}
            labelFormatter={() => 'Стоимость портфеля'}
            formatter={(v) => [Number(v).toFixed(2), 'Индекс']}
          />
          <Area
            type="linear"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#chart-${seed})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function useNotice() {
  const [notice, setNotice] = useState('');
  function notify(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 3500);
  }
  return {
    notify,
    element: notice ? (
      <div role="status" className={s.toast}>
        {notice}
      </div>
    ) : null,
  };
}
export const fmt = (value: string | number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(value)) + ' ₽';
export const pct = (value: string | number) =>
  `${Number(value) > 0 ? '+' : ''}${Number(value).toFixed(2).replace('.', ',')}%`;
