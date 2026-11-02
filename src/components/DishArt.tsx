import { useState } from 'react';
import { cx } from '../lib/util';

/** Bundled illustration kinds usable as `art:<kind>` in MenuItem.image. */
export const ART_KINDS = [
  'meals',
  'biryani',
  'chicken65',
  'pepperchicken',
  'mutton',
  'fish',
  'omelette',
  'kolumbu',
  'parotta',
  'curdrice',
  'drink',
  'generic',
] as const;
export type ArtKind = (typeof ART_KINDS)[number];

export const ART_LABELS: Record<ArtKind, string> = {
  meals: 'Banana leaf meals',
  biryani: 'Biryani handi',
  chicken65: 'Chicken 65',
  pepperchicken: 'Pepper fry',
  mutton: 'Mutton curry',
  fish: 'Fish fry',
  omelette: 'Omelette',
  kolumbu: 'Kolumbu omelette',
  parotta: 'Parotta',
  curdrice: 'Curd rice',
  drink: 'Drink',
  generic: 'Plate',
};

export function artForCategory(category: string): ArtKind {
  const c = category.toLowerCase();
  if (c.includes('meal')) return 'meals';
  if (c.includes('biryani')) return 'biryani';
  if (c.includes('chicken')) return 'chicken65';
  if (c.includes('mutton')) return 'mutton';
  if (c.includes('fish')) return 'fish';
  if (c.includes('egg')) return 'omelette';
  if (c.includes('bread') || c.includes('parotta')) return 'parotta';
  if (c.includes('rice')) return 'curdrice';
  if (c.includes('drink')) return 'drink';
  if (c.includes('starter')) return 'chicken65';
  return 'generic';
}

const Leaf = () => (
  <g>
    <path d="M-8 98 C 26 22, 118 -8, 170 16 C 152 86, 62 132, -8 98 Z" fill="#2F7D3A" />
    <path d="M-8 98 C 26 22, 118 -8, 170 16 C 120 22, 40 52, -8 98 Z" fill="#3E8E45" opacity="0.6" />
    <path d="M-4 96 C 48 70, 110 38, 168 17" stroke="#9BCB8A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <g stroke="#9BCB8A" strokeWidth="0.9" opacity="0.45" fill="none">
      <path d="M24 82 L 6 58" /><path d="M48 70 L 30 40" /><path d="M74 58 L 60 24" /><path d="M100 46 L 90 14" />
      <path d="M126 35 L 120 8" /><path d="M30 80 L 46 106" /><path d="M56 68 L 76 100" /><path d="M84 55 L 106 86" />
      <path d="M112 42 L 134 68" /><path d="M138 31 L 156 50" />
    </g>
  </g>
);

const Plate = ({ cx: x = 80, cy = 62, r = 40 }: { cx?: number; cy?: number; r?: number }) => (
  <g>
    <ellipse cx={x} cy={cy + 3} rx={r} ry={r * 0.82} fill="#000" opacity="0.15" />
    <ellipse cx={x} cy={cy} rx={r} ry={r * 0.82} fill="#F6F1E6" />
    <ellipse cx={x} cy={cy} rx={r - 6} ry={(r - 6) * 0.82} fill="#FFFCF5" />
  </g>
);

const Bowl = ({ x, y, r, fill, top }: { x: number; y: number; r: number; fill: string; top?: string }) => (
  <g>
    <ellipse cx={x} cy={y + 2} rx={r} ry={r * 0.8} fill="#000" opacity="0.15" />
    <ellipse cx={x} cy={y} rx={r} ry={r * 0.8} fill="#D9D4CA" />
    <ellipse cx={x} cy={y} rx={r - 2.5} ry={(r - 2.5) * 0.8} fill={fill} />
    {top && <ellipse cx={x - r * 0.25} cy={y - r * 0.2} rx={r * 0.3} ry={r * 0.15} fill={top} opacity="0.7" />}
  </g>
);

const CurryLeaf = ({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) => (
  <ellipse cx={x} cy={y} rx="5" ry="2.2" fill="#1B5E20" transform={`rotate(${rot} ${x} ${y})`} />
);

const Blob = ({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) => (
  <path
    d={`M${x - 7 * s} ${y} c ${-1 * s} ${-6 * s} ${6 * s} ${-9 * s} ${10 * s} ${-6 * s} c ${5 * s} ${2 * s} ${6 * s} ${8 * s} ${1 * s} ${11 * s} c ${-4 * s} ${3 * s} ${-10 * s} ${1 * s} ${-11 * s} ${-5 * s} z`}
    fill={fill}
  />
);

function Dish({ kind }: { kind: ArtKind }) {
  switch (kind) {
    case 'meals':
      return (
        <g>
          <ellipse cx="74" cy="68" rx="27" ry="14" fill="#000" opacity="0.12" />
          <ellipse cx="74" cy="64" rx="26" ry="14" fill="#FFFDF7" />
          <ellipse cx="68" cy="60" rx="12" ry="5" fill="#fff" />
          <g fill="#EFE8D8">{[0, 1, 2, 3, 4, 5].map((i) => <ellipse key={i} cx={60 + i * 5} cy={66 + (i % 2) * 3} rx="2" ry="1" />)}</g>
          <Bowl x={114} y={44} r={12} fill="#D9772E" top="#F2A65A" />
          <Bowl x={120} y={72} r={11} fill="#B5341F" top="#E0613F" />
          <Bowl x={40} y={46} r={11} fill="#7A3A1A" top="#A0522D" />
          <Bowl x={98} y={92} r={10} fill="#FFF6DD" />
          <circle cx="44" cy="82" r="13" fill="#F3DFA2" />
          <g fill="#D9B46A">{[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={38 + (i % 3) * 6} cy={78 + Math.floor(i / 3) * 7} r="1" />)}</g>
          <CurryLeaf x={80} y={52} rot={-20} />
        </g>
      );
    case 'biryani':
      return (
        <g>
          <ellipse cx="80" cy="84" rx="44" ry="14" fill="#000" opacity="0.18" />
          <path d="M40 58 C 40 98, 120 98, 120 58 Z" fill="#B4632E" />
          <path d="M44 66 C 52 88, 108 88, 116 66" stroke="#D98A4F" strokeWidth="2" fill="none" opacity="0.6" />
          <ellipse cx="80" cy="58" rx="42" ry="11" fill="#8E4A20" />
          <ellipse cx="80" cy="57" rx="36" ry="8.5" fill="#F2C14E" />
          <g fill="#FFF8E1">{[...Array(14)].map((_, i) => <ellipse key={i} cx={52 + (i % 7) * 9} cy={54 + Math.floor(i / 7) * 5} rx="2.4" ry="0.9" transform={`rotate(${i * 25} ${52 + (i % 7) * 9} ${54 + Math.floor(i / 7) * 5})`} />)}</g>
          <g fill="#E07A1F">{[...Array(6)].map((_, i) => <ellipse key={i} cx={58 + i * 9} cy={58 + (i % 2) * 2} rx="2.2" ry="0.9" />)}</g>
          <Blob x={86} y={56} s={1.1} fill="#8B3A12" />
          <CurryLeaf x={66} y={55} rot={30} />
          <ellipse cx="102" cy="58" rx="3" ry="1.6" fill="#4CAF50" />
          <path d="M120 58 h 10 a 4 4 0 0 1 0 8 h -10" stroke="#8E4A20" strokeWidth="3" fill="none" />
          <path d="M40 58 h -10 a 4 4 0 0 0 0 8 h 10" stroke="#8E4A20" strokeWidth="3" fill="none" />
        </g>
      );
    case 'chicken65':
    case 'pepperchicken':
    case 'mutton': {
      const colors =
        kind === 'chicken65' ? ['#C0391B', '#A42A14', '#D94A22'] : kind === 'pepperchicken' ? ['#6B3518', '#80421D', '#5A2B12'] : ['#7A2E12', '#5E2410', '#8C3A18'];
      return (
        <g>
          <Plate />
          {kind === 'mutton' && <ellipse cx="80" cy="62" rx="30" ry="22" fill="#9A4A1E" />}
          {[
            [66, 56, 1.1], [86, 52, 1], [96, 66, 1.1], [72, 72, 1], [60, 64, 0.8], [84, 68, 0.9], [100, 54, 0.7],
          ].map(([x, y, s], i) => (
            <Blob key={i} x={x} y={y} s={s} fill={colors[i % 3]} />
          ))}
          {kind === 'pepperchicken' && (
            <g fill="#1A0F0A">{[...Array(14)].map((_, i) => <circle key={i} cx={58 + ((i * 37) % 44)} cy={50 + ((i * 23) % 26)} r="0.9" />)}</g>
          )}
          <CurryLeaf x={76} y={50} rot={-30} />
          <CurryLeaf x={92} y={74} rot={20} />
          <CurryLeaf x={62} y={56} rot={60} />
          <circle cx="104" cy="76" r="5.5" fill="none" stroke="#E7B8D3" strokeWidth="1.6" />
          <circle cx="56" cy="74" r="4.5" fill="none" stroke="#E7B8D3" strokeWidth="1.4" />
          <path d="M110 64 a 8 8 0 0 1 4 12 z" fill="#F2CF5B" />
        </g>
      );
    }
    case 'fish':
      return (
        <g>
          <ellipse cx="80" cy="66" rx="50" ry="30" fill="#000" opacity="0.15" />
          <ellipse cx="80" cy="63" rx="50" ry="30" fill="#F6F1E6" />
          <ellipse cx="80" cy="63" rx="44" ry="25" fill="#FFFCF5" />
          <g transform="rotate(-8 80 62)">
            <ellipse cx="76" cy="62" rx="32" ry="13" fill="#C2562E" />
            <path d="M106 62 L 122 50 L 120 74 Z" fill="#A4431F" />
            <circle cx="54" cy="59" r="2.6" fill="#FFFCF5" />
            <circle cx="54" cy="59" r="1.2" fill="#2B1A12" />
            <g stroke="#8E3415" strokeWidth="1.6" strokeLinecap="round">
              <path d="M66 54 l 4 14" /><path d="M76 52 l 4 16" /><path d="M86 53 l 4 14" /><path d="M96 56 l 3 10" />
            </g>
            <g fill="#E07A1F" opacity="0.6">{[...Array(8)].map((_, i) => <circle key={i} cx={60 + i * 5} cy={64 + (i % 2) * 3} r="1.2" />)}</g>
          </g>
          <circle cx="112" cy="80" r="7" fill="#C5E1A5" stroke="#7CB342" strokeWidth="1.5" />
          <path d="M112 73 v14 M105 80 h14" stroke="#7CB342" strokeWidth="0.8" />
          <circle cx="50" cy="78" r="5" fill="none" stroke="#E7B8D3" strokeWidth="1.6" />
          <CurryLeaf x={44} y={68} rot={40} />
        </g>
      );
    case 'omelette':
      return (
        <g>
          <Plate />
          <circle cx="80" cy="62" r="28" fill="#F4C54A" />
          <path d="M60 50 C 70 40, 96 42, 102 56 C 92 50, 74 48, 60 50 Z" fill="#F8DA7A" />
          <g fill="#E8A03A" opacity="0.7">{[...Array(6)].map((_, i) => <ellipse key={i} cx={64 + i * 6} cy={66 + (i % 3) * 4} rx="4" ry="2" />)}</g>
          <g fill="#4CAF50">{[...Array(7)].map((_, i) => <circle key={i} cx={62 + ((i * 29) % 36)} cy={52 + ((i * 17) % 22)} r="1.3" />)}</g>
          <g fill="#C62828">{[...Array(5)].map((_, i) => <circle key={i} cx={68 + ((i * 41) % 26)} cy={56 + ((i * 19) % 18)} r="1.1" />)}</g>
          <g fill="#F3E5F5">{[...Array(5)].map((_, i) => <rect key={i} x={66 + ((i * 23) % 28)} y={60 + ((i * 13) % 14)} width="3" height="1.4" rx="0.7" />)}</g>
        </g>
      );
    case 'kolumbu':
      return (
        <g>
          <Plate />
          <ellipse cx="80" cy="64" rx="30" ry="22" fill="#9A3E12" />
          <ellipse cx="72" cy="58" rx="10" ry="4" fill="#C2562E" opacity="0.6" />
          <path d="M56 66 C 56 44, 104 44, 104 66 Z" fill="#F4C54A" />
          <path d="M56 66 C 66 70, 94 70, 104 66" stroke="#E0A030" strokeWidth="2" fill="none" />
          <g fill="#4CAF50">{[...Array(5)].map((_, i) => <circle key={i} cx={66 + i * 7} cy={56 + (i % 2) * 3} r="1.3" />)}</g>
          <g fill="#7A2E12">{[...Array(4)].map((_, i) => <ellipse key={i} cx={64 + i * 10} cy={60} rx="3" ry="1.4" />)}</g>
          <CurryLeaf x={98} y={76} rot={10} />
          <CurryLeaf x={60} y={76} rot={-20} />
        </g>
      );
    case 'parotta':
      return (
        <g>
          <Plate />
          {[
            [72, 66],
            [88, 58],
          ].map(([x, y], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx="24" ry="19" fill="#E8B96A" />
              <ellipse cx={x} cy={y} rx="24" ry="19" fill="none" stroke="#C98E3E" strokeWidth="1.2" />
              <path
                d={`M${x} ${y} m -2 0 a 3 3 0 1 1 5 1 a 7 6 0 1 1 -11 -2 a 11 9 0 1 1 18 4 a 15 12 0 1 1 -25 -5 a 19 15 0 1 1 32 4`}
                fill="none"
                stroke="#B97A30"
                strokeWidth="1.2"
                opacity="0.8"
              />
              <ellipse cx={x - 8} cy={y - 7} rx="5" ry="2" fill="#F8DCA0" opacity="0.8" />
              <ellipse cx={x + 9} cy={y + 6} rx="4" ry="2" fill="#A86A28" opacity="0.4" />
            </g>
          ))}
          <Bowl x={120} y={80} r={9} fill="#8B3A12" top="#B5541E" />
        </g>
      );
    case 'curdrice':
      return (
        <g>
          <ellipse cx="80" cy="74" rx="38" ry="16" fill="#000" opacity="0.15" />
          <path d="M44 60 C 46 92, 114 92, 116 60 Z" fill="#C7C2B6" />
          <ellipse cx="80" cy="60" rx="36" ry="12" fill="#D9D4CA" />
          <ellipse cx="80" cy="59" rx="32" ry="9.5" fill="#FFFDF5" />
          <g fill="#F0E9D8">{[...Array(10)].map((_, i) => <ellipse key={i} cx={58 + (i % 5) * 10} cy={56 + Math.floor(i / 5) * 5} rx="2" ry="0.8" />)}</g>
          <g fill="#2B1A12">{[...Array(9)].map((_, i) => <circle key={i} cx={62 + ((i * 31) % 36)} cy={54 + ((i * 7) % 9)} r="0.9" />)}</g>
          <g fill="#D81B60">{[...Array(5)].map((_, i) => <circle key={i} cx={70 + ((i * 17) % 24)} cy={57 + ((i * 11) % 6)} r="1.4" />)}</g>
          <CurryLeaf x={88} y={55} rot={-15} />
          <CurryLeaf x={70} y={60} rot={25} />
          <path d="M96 60 q 6 -4 12 -2" stroke="#B71C1C" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'drink':
      return (
        <g>
          <ellipse cx="80" cy="98" rx="20" ry="5" fill="#000" opacity="0.18" />
          <path d="M60 28 L 100 28 L 95 96 L 65 96 Z" fill="#E8F5C8" opacity="0.92" />
          <path d="M62 44 L 98 44 L 95 96 L 65 96 Z" fill="#CDE88F" opacity="0.9" />
          <path d="M60 28 L 100 28" stroke="#fff" strokeWidth="2" />
          <path d="M66 32 L 69 92" stroke="#fff" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
          <g fill="#fff" opacity="0.85">{[...Array(9)].map((_, i) => <circle key={i} cx={70 + ((i * 13) % 22)} cy={52 + ((i * 17) % 38)} r={1 + (i % 3) * 0.6} />)}</g>
          <rect x="84" y="10" width="4" height="40" rx="2" fill="#C2562E" transform="rotate(14 86 30)" />
          <circle cx="62" cy="30" r="11" fill="#9CCC65" />
          <circle cx="62" cy="30" r="8.5" fill="#DCEDC8" />
          <g stroke="#9CCC65" strokeWidth="1">{[0, 45, 90, 135].map((a) => <path key={a} d="M53.5 30 h17" transform={`rotate(${a} 62 30)`} />)}</g>
          <CurryLeaf x={98} y={26} rot={-30} />
        </g>
      );
    default:
      return (
        <g>
          <Plate />
          <ellipse cx="80" cy="62" rx="20" ry="12" fill="#FFF8E6" />
          <Bowl x={98} y={56} r={9} fill="#D9772E" />
          <g stroke="#FFFCF5" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8">
            <path d="M70 34 c -4 -6 4 -8 0 -14" /><path d="M80 32 c -4 -6 4 -8 0 -14" /><path d="M90 34 c -4 -6 4 -8 0 -14" />
          </g>
        </g>
      );
  }
}

export function DishArt({ kind, className }: { kind: ArtKind; className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} preserveAspectRatio="xMidYMid slice" role="img" aria-label={ART_LABELS[kind]}>
      <rect width="160" height="120" fill="#F4E6C8" />
      <g opacity="0.35" fill="#E8B73A">
        {[...Array(6)].map((_, r) =>
          [...Array(8)].map((__, c) => <circle key={`${r}-${c}`} cx={10 + c * 20 + (r % 2) * 10} cy={10 + r * 20} r="1.1" />),
        )}
      </g>
      <Leaf />
      <Dish kind={kind} />
    </svg>
  );
}

/** Renders a menu item image: bundled art, uploaded data URL, or remote URL with graceful fallback. */
export function DishImage({ image, category, alt, className }: { image: string; category: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const isArt = image.startsWith('art:');
  const kind = (isArt ? image.slice(4) : artForCategory(category)) as ArtKind;
  if (isArt || !image || failed) {
    return <DishArt kind={ART_KINDS.includes(kind) ? kind : 'generic'} className={cx('h-full w-full', className)} />;
  }
  return (
    <img
      src={image}
      alt={alt}
      loading="lazy"
      className={cx('h-full w-full object-cover', className)}
      onError={() => setFailed(true)}
    />
  );
}
