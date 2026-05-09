// Bloom デザインの手描き風 SVG イラスト集
// 元参照: design_handoff_bloom/illustrations.jsx
// stroke-linecap: round と軽くオフセットしたパスで「ベクター完璧」じゃない手作り感を出す

type IllustrationProps = {
  size?: number;
  color?: string;
  stroke?: number;
};

export const Sprout = ({ size = 40, color = "currentColor", stroke = 2 }: IllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
    <path d="M20 32 C 20 22, 20 16, 20 12" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
    <path d="M20 18 C 14 16, 10 12, 9 7 C 14 6, 19 9, 20 14" fill={color} opacity="0.85" />
    <path d="M20 16 C 26 14, 30 11, 32 7 C 27 5, 22 8, 20 13" fill={color} opacity="0.7" />
    <path d="M14 33 Q 20 31, 26 33" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
  </svg>
);

export const Sparkle = ({ size = 20, color = "currentColor" }: IllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
    <path d="M10 2 L11.2 8.5 L17.5 10 L11.2 11.5 L10 18 L8.8 11.5 L2.5 10 L8.8 8.5 Z" fill={color} />
  </svg>
);

export const Sun = ({ size = 60, color = "#F5B945" }: IllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 60 60" fill="none" aria-hidden>
    <circle cx="30" cy="30" r="13" fill={color} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
      <line
        key={i}
        x1="30"
        y1="6"
        x2="30"
        y2="14"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        transform={`rotate(${deg} 30 30)`}
      />
    ))}
  </svg>
);

type CloudProps = { size?: number; color?: string; strokeColor?: string };
export const Cloud = ({ size = 80, color = "#fff", strokeColor = "#E8DCC4" }: CloudProps) => (
  <svg width={size} height={size * 0.6} viewBox="0 0 80 48" fill="none" aria-hidden>
    <path
      d="M14 36 Q 6 36, 6 28 Q 6 20, 14 20 Q 16 12, 26 12 Q 36 10, 40 18 Q 50 16, 54 24 Q 64 24, 64 32 Q 64 38, 56 38 Z"
      fill={color}
      stroke={strokeColor}
      strokeWidth="1.5"
    />
  </svg>
);

export const Heart = ({ size = 24, color = "#E89A9A" }: IllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 20 C 4 14, 2 9, 5 6 C 8 3, 11 5, 12 8 C 13 5, 16 3, 19 6 C 22 9, 20 14, 12 20 Z" fill={color} />
  </svg>
);

// 家のシルエット「マイホーム＝家族」アイコン（手描き風・屋根＋壁＋ドア）
export const Family = ({ size = 24, color = "#E89A9A", stroke = 2 }: IllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    {/* 屋根（少しオフセットで手描き感） */}
    <path
      d="M3 12 L12 3.5 L21 12"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* 家の壁＋床（コの字） */}
    <path
      d="M5.5 11 L5.5 20.5 L18.5 20.5 L18.5 11"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* ドア（中央下・家族の入口を象徴） */}
    <path
      d="M10 20.5 L10 14.8 Q 12 13.8, 14 14.8 L 14 20.5"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const Star = ({ size = 24, color = "#F5B945" }: IllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M12 2 L14.5 9 L22 9.5 L16 14 L18 21 L12 17 L6 21 L8 14 L2 9.5 L9.5 9 Z"
      fill={color}
      stroke={color}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

type WavyLineProps = { width?: number; color?: string; stroke?: number };
export const WavyLine = ({ width = 240, color = "currentColor", stroke = 2 }: WavyLineProps) => (
  <svg width={width} height="10" viewBox={`0 0 ${width} 10`} fill="none" preserveAspectRatio="none" aria-hidden>
    <path
      d={`M2 5 Q ${width * 0.15} 1, ${width * 0.3} 5 T ${width * 0.6} 5 T ${width * 0.9} 5 T ${width - 2} 5`}
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

// 鉢植え（子どもカード・めやすカードの背景イラスト）
export const PottedPlant = ({ size = 100 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
    <path d="M30 60 L 70 60 L 65 92 L 35 92 Z" fill="#C97B5A" stroke="#5C3A28" strokeWidth="1.5" />
    <ellipse cx="50" cy="60" rx="20" ry="3" fill="#3A2418" opacity="0.3" />
    <path d="M50 60 C 50 45, 50 35, 50 25" stroke="#4A6B3A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M50 40 C 38 38, 30 30, 28 20 C 36 18, 46 22, 50 32" fill="#7BA85F" stroke="#4A6B3A" strokeWidth="1.5" />
    <path d="M50 35 C 62 33, 70 28, 74 18 C 66 14, 56 18, 50 28" fill="#7BA85F" stroke="#4A6B3A" strokeWidth="1.5" />
    <circle cx="36" cy="74" r="2" fill="#5C3A28" opacity="0.5" />
    <circle cx="58" cy="80" r="1.5" fill="#5C3A28" opacity="0.5" />
  </svg>
);

// 開いた絵本（思い出ページCTA）
export const OpenBook = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size * 0.75} viewBox="0 0 120 90" fill="none" aria-hidden>
    <path d="M10 22 Q 30 16, 58 22 L 58 80 Q 30 74, 10 80 Z" fill="#FBF6E8" stroke="#8C6A3F" strokeWidth="1.5" />
    <path d="M110 22 Q 90 16, 62 22 L 62 80 Q 90 74, 110 80 Z" fill="#FBF6E8" stroke="#8C6A3F" strokeWidth="1.5" />
    <line x1="60" y1="22" x2="60" y2="80" stroke="#8C6A3F" strokeWidth="1.2" />
    <path d="M22 36 L 50 38" stroke="#C9B89A" strokeWidth="1" />
    <path d="M22 44 L 48 45" stroke="#C9B89A" strokeWidth="1" />
    <path d="M22 52 L 50 53" stroke="#C9B89A" strokeWidth="1" />
    <path d="M70 36 L 100 38" stroke="#C9B89A" strokeWidth="1" />
    <path d="M70 44 L 96 45" stroke="#C9B89A" strokeWidth="1" />
    <g transform="translate(38, 50)">
      <path d="M10 28 L 10 14" stroke="#5A8A4A" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 18 C 5 16, 2 12, 1 8 C 6 7, 10 10, 11 14" fill="#7BA85F" />
    </g>
  </svg>
);

// 簡易バーチャート（年表 empty state）
// 歯車（設定アイコン）。8本歯のシンプルな手書き風
export const Gear = ({ size = 24, color = "currentColor", stroke = 2 }: IllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    {/* 8本の歯（短い長方形を回転） */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
      <rect
        key={i}
        x="10.5"
        y="1.5"
        width="3"
        height="4"
        rx="0.8"
        fill={color}
        transform={`rotate(${deg} 12 12)`}
      />
    ))}
    {/* 外円 */}
    <circle cx="12" cy="12" r="6.5" fill={color} />
    {/* 中央の穴 */}
    <circle cx="12" cy="12" r="2.4" fill="#fff" />
  </svg>
);

export const TinyBars = ({ size = 80, color = "#F5B945" }: IllustrationProps) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden>
    <rect x="10" y="40" width="14" height="30" rx="3" fill={color} opacity="0.5" />
    <rect x="33" y="20" width="14" height="50" rx="3" fill={color} opacity="0.75" />
    <rect x="56" y="32" width="14" height="38" rx="3" fill={color} />
    <circle cx="17" cy="40" r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
    <circle cx="40" cy="20" r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
    <circle cx="63" cy="32" r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
    <path d="M17 40 Q 28 30, 40 20 Q 52 26, 63 32" stroke={color} strokeWidth="1.5" fill="none" strokeDasharray="2 2" />
  </svg>
);
