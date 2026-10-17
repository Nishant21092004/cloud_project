/**
 * BouquetPreview — a responsive 2D illustrated composition.
 * Renders the selected flowers as a fan arrangement with a wrap cone and
 * ribbon — pure SVG, no images needed, updates live as the customer builds.
 */
interface PreviewFlower {
  colorHex: string;
  stems: number;
  name: string;
}

export function BouquetPreview({ flowers, wrapColor = "#e8c8b7", ribbonColor = "#c96f87" }: {
  flowers: PreviewFlower[];
  wrapColor?: string;
  ribbonColor?: string;
}) {
  const vb = { w: 320, h: 300 };
  const cx = vb.w / 2;
  const baseY = 268;

  // distribute stems in a fan: each flower's stems get angles across the arc
  const totalStems = flowers.reduce((s, f) => s + f.stems, 0);
  const slots: Array<{ color: string; angle: number; r: number; layer: number }> = [];
  let angleCursor = -62;
  flowers.forEach((f, fi) => {
    for (let i = 0; i < f.stems; i++) {
      const spread = 124 / Math.max(1, totalStems - 1);
      slots.push({
        color: f.colorHex,
        angle: -62 + slots.length * spread + (fi % 2 ? 2 : -2),
        r: 15 + ((fi + i) % 3) * 3.5,
        layer: fi % 3,
      });
    }
  });
  slots.sort((a, b) => Math.abs(a.angle) - Math.abs(b.angle)); // centre-first layering
  const back = slots.filter((_, i) => i % 2 === 0);
  const front = slots.filter((_, i) => i % 2 === 1);

  const bloom = (s: { color: string; angle: number; r: number }) => {
    const rad = ((s.angle - 90) * Math.PI) / 180;
    const dist = 92;
    const x = cx + Math.cos(rad) * dist;
    const y = baseY - 60 + Math.sin(rad) * dist;
    return { x, y, ...s };
  };

  const stemPath = (s: { color: string; angle: number }) => {
    const rad = ((s.angle - 90) * Math.PI) / 180;
    const tipX = cx + Math.cos(rad) * 92;
    const tipY = baseY - 60 + Math.sin(rad) * 92;
    const mx = cx + (tipX - cx) * 0.4 + (tipX - cx) * 0.25;
    return `M ${cx} ${baseY - 40} Q ${mx} ${(baseY - 40 + tipY) / 2} ${tipX} ${tipY}`;
  };

  return (
    <svg viewBox={`0 0 ${vb.w} ${vb.h}`} className="w-full max-w-[320px]" role="img" aria-label="Bouquet preview">
      <defs>
        <radialGradient id="pv-bg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#fffdf7" />
          <stop offset="100%" stopColor="#f3ecdc" />
        </radialGradient>
      </defs>
      <rect width={vb.w} height={vb.h} rx="16" fill="url(#pv-bg)" />

      {totalStems === 0 && (
        <text x={cx} y={vb.h / 2} textAnchor="middle" className="fill-forest-700/50" fontSize="12" fontFamily="Georgia, serif">
          Pick flowers to see your bouquet bloom
        </text>
      )}

      {/* back layer */}
      {back.map((s, i) => (
        <g key={`b${i}`}>
          <path d={stemPath(s)} stroke="#4c7a58" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {back.map((s, i) => {
        const p = bloom(s);
        return <Bloom key={`bb${i}`} x={p.x} y={p.y} r={s.r} color={s.color} />;
      })}

      {/* front layer */}
      {front.map((s, i) => (
        <path key={`fs${i}`} d={stemPath(s)} stroke="#5b8a63" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ))}

      {/* wrap cone */}
      <path d={`M ${cx - 62} ${baseY - 96} L ${cx + 62} ${baseY - 96} L ${cx + 6} ${baseY + 12} Q ${cx} ${baseY + 18} ${cx - 6} ${baseY + 12} Z`} fill={wrapColor} />
      <path d={`M ${cx - 62} ${baseY - 96} L ${cx + 6} ${baseY + 12} L ${cx - 22} ${baseY - 96} Z`} fill="#00000014" />
      <rect x={cx - 40} y={baseY - 52} width="80" height="11" rx="5" fill={ribbonColor} />
      <circle cx={cx} cy={baseY - 46} r="6" fill="#00000030" />

      {/* front blooms above the wrap */}
      {front.map((s, i) => {
        const p = bloom(s);
        return <Bloom key={`ff${i}`} x={p.x} y={p.y} r={s.r} color={s.color} />;
      })}
      <ellipse cx={cx} cy={baseY + 20} rx="70" ry="7" fill="#00000010" />
    </svg>
  );
}

function Bloom({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      {petals.map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <ellipse
            key={a}
            cx={x + Math.cos(rad) * r * 0.62}
            cy={y + Math.sin(rad) * r * 0.62}
            rx={r * 0.5}
            ry={r * 0.42}
            fill={color}
            transform={`rotate(${a} ${x + Math.cos(rad) * r * 0.62} ${y + Math.sin(rad) * r * 0.62})`}
          />
        );
      })}
      <circle cx={x} cy={y} r={r * 0.4} fill="#00000022" />
      <circle cx={x - r * 0.1} cy={y - r * 0.12} r={r * 0.16} fill="#ffffff55" />
    </g>
  );
}
