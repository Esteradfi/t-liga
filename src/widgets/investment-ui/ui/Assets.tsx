import copper from '../assets/ranks/copper-hamster.svg';
import bronze from '../assets/ranks/bronze-fox.svg';
import silver from '../assets/ranks/silver-wolf.svg';
import gold from '../assets/ranks/gold-bull.svg';
import platinum from '../assets/ranks/platinum-shark.svg';
import diamond from '../assets/ranks/diamond-whale.svg';
import titan from '../assets/ranks/wall-street-titan.svg';
import predator from '../assets/ranks/market-predator.svg';
export const rankNames = [
  'Медный Хомяк',
  'Бронзовый Лис',
  'Серебряный Волк',
  'Золотой Бык',
  'Платиновая Акула',
  'Алмазный Кит',
  'Титан Уолл-стрит',
  'Хищник рынка',
];
const rankImages = [copper, bronze, silver, gold, platinum, diamond, titan, predator];
export function RankBadge({
  name = 'Серебряный Волк',
  size = 48,
}: {
  name?: string;
  size?: number;
}) {
  const index = rankNames.findIndex((rank) => name.startsWith(rank));
  return (
    <img
      src={rankImages[index < 0 ? 2 : index]}
      alt={`Эмблема: ${name}`}
      width={size}
      height={size * 1.125}
      style={{ objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
export const personas = [
  {
    name: 'Макс',
    quote: 'Рынок движется. Я проверяю, есть ли вход по нашим правилам.',
    style: 'Активная торговля',
    description: 'Короткие сделки, ликвидность и чёткие условия выхода.',
    color: '#edb94b',
  },
  {
    name: 'Лев',
    quote: 'Красивый график. Теперь посмотрим на цифры и весь портфель.',
    style: 'Вдумчивый подход',
    description: 'Качество активов, длинный горизонт и постепенный набор.',
    color: '#8e9bb8',
  },
  {
    name: 'Чилл',
    quote: 'Пока держим план. Суета в него не входит.',
    style: 'Спокойный баланс',
    description: 'Целевые доли, диверсификация и редкая ребалансировка.',
    color: '#b5c7a8',
  },
];
export function AgentAvatar({ index = 0, size = 60 }: { index?: number; size?: number }) {
  const i = Math.max(0, Math.min(2, index));
  const c = personas[i].color;
  return (
    <svg
      viewBox="0 0 140 150"
      role="img"
      aria-label={personas[i].name}
      width={size}
      height={size * 1.07}
      style={{ flexShrink: 0 }}
    >
      <ellipse cx="70" cy="137" rx="43" ry="7" fill="#000" opacity=".07" />
      <path
        d="M28 130q0-45 42-45t42 45"
        fill={i === 0 ? '#343b49' : i === 1 ? '#45516b' : '#8b9e86'}
      />
      <path d="M48 95v36m44-36v36" stroke="#ffffff30" strokeWidth="3" />
      <path d="M33 48 27 14 55 32M87 32l26-18-6 38" fill={c} />
      <rect x="28" y="31" width="84" height="72" rx={i === 2 ? 30 : 24} fill={c} />
      <ellipse cx="70" cy="77" rx="30" ry="21" fill="#fff" opacity=".35" />
      <ellipse cx="51" cy="59" rx="4" ry="6" fill="#29323f" />
      <ellipse cx="89" cy="59" rx="4" ry="6" fill="#29323f" />
      <path
        d="M64 73q6 6 12 0M61 86q9 6 18 0"
        fill="none"
        stroke="#394252"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {i === 1 ? (
        <>
          <path
            d="M35 53h28v17H35zm42 0h28v17H77zm-14 7h14"
            fill="none"
            stroke="#354052"
            strokeWidth="3"
          />
          <path d="m58 103 12 15 12-15" fill="#ffdd2d" />
        </>
      ) : i === 0 ? (
        <>
          <path d="M24 42q46-42 92 0" fill="#303846" />
          <path d="M26 40h93" stroke="#303846" strokeWidth="9" strokeLinecap="round" />
        </>
      ) : (
        <path d="M31 50q-9 36 5 52m73-52q9 36-5 52" stroke="#8b9e86" strokeWidth="9" fill="none" />
      )}
      <rect x="76" y="116" width="17" height="10" rx="3" fill="#ffdd2d" />
      <path d="M80 119h9" stroke="#333" strokeWidth="2" />
    </svg>
  );
}

export function RewardArt({
  kind,
  index = 0,
  agentIndex = 0,
}: {
  kind: string;
  index?: number;
  agentIndex?: number;
}) {
  const color = ['#cba557', '#6a91bd', '#a68bc4', '#85a88d'][index % 4];
  if (kind === 'skin' || kind === 'accessory') return <AgentAvatar index={agentIndex} size={62} />;
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      {kind === 'card' || kind === 'cover' ? (
        <>
          <rect x="10" y="15" width="60" height="45" rx="7" fill="#35445c" />
          <path d="m20 46 10-9 10 4 10-14 10 3" fill="none" stroke="#ffdd2d" strokeWidth="3" />
          <path d="M20 25h17" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : kind === 'theme' ? (
        <>
          <rect x="18" y="8" width="44" height="64" rx="10" fill="#253044" />
          <rect x="24" y="17" width="32" height="15" rx="4" fill="#ffdd2d" />
          <rect x="24" y="37" width="14" height="23" rx="3" fill="#677ba1" />
          <rect x="42" y="37" width="14" height="23" rx="3" fill="#475a7c" />
        </>
      ) : kind === 'animation' ? (
        <>
          <path d="m40 5 7 24 25 11-25 8-7 27-9-27L7 40l24-11z" fill={color} />
          <circle cx="64" cy="13" r="4" fill="#ffdf72" />
          <circle cx="15" cy="62" r="3" fill="#ffdf72" />
        </>
      ) : (
        <>
          <path d="m40 6 26 12-4 35-22 20-22-20-4-35z" fill={color} />
          <path d="m40 21 5 11 12 2-9 9 2 12-10-6-10 6 2-12-9-9 12-2z" fill="#fff4cb" />
        </>
      )}
    </svg>
  );
}
export function MiniSpark({
  data,
  color = '#1aaf82',
}: {
  data: { value: number }[];
  color?: string;
}) {
  const values = data.map((p) => p.value),
    min = Math.min(...values),
    range = Math.max(...values) - min || 1;
  return (
    <svg width="48" height="26" viewBox="0 0 100 32" aria-hidden="true">
      <polyline
        points={values
          .map((v, i) => `${(i / (values.length - 1 || 1)) * 100},${29 - ((v - min) / range) * 25}`)
          .join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.7"
      />
    </svg>
  );
}
export function instrumentSymbol(id: string) {
  return (
    (
      { SBER: 'С', YDEX: 'Я', OFZ26238: 'ОФЗ', GOLD: 'Au', LKOH: 'Л', TMON: '₽' } as Record<
        string,
        string
      >
    )[id] || id.slice(0, 2)
  );
}
