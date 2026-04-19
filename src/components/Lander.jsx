import "./Lander.css";
import monkImg from "../assets/hero.png";

// ─── Orbit definitions ───────────────────────────────────────────────────────
// All centered at (CX=400, CY=320) in a 800×640 viewBox
// Back arc  = upper half of ellipse (y < CY) → drawn BEHIND monk
// Front arc = lower half of ellipse (y > CY) → drawn IN FRONT of monk legs
//
// Tilt is applied via SVG transform="rotate(angle CX CY)" on path groups
// This keeps math simple: paths are defined in screen-aligned coords,
// then rotated around the shared center

const CX = 400,
  CY = 320;

const ORBITS = [
  // [rx, ry, tiltDeg, colorBack, colorFront]
  [197, 55, -22, "#ff6b35", "#ff6b35"],
  [322, 89, -20, "#cc44ff", "#cc44ff"],
  [472, 140, -18, "#4488ff", "#4488ff"],
];

// Icons: [orbitIndex, durSeconds, beginOffset, label, fillColor, textColor, shape]
const ICONS = [
  [0, 12, "0s", "react", "#0f2a1a", "#00e676", "react"],
  [1, 19, "0s", "JS", "#F7DF1E", "#000000", "square"],
  [1, 19, "-9.5s", "TS", "#3178C6", "#ffffff", "hex"],
  [2, 27, "0s", "TS", "#e05a00", "#ffffff", "hex"],
];

// Build SVG ellipse path strings
// Back arc: left→right going via TOP (sweep-flag=0 in SVG = ccw = goes up)
// Front arc: right→left going via BOTTOM (sweep-flag=0 again but reversed start)
function backArcPath(rx, ry) {
  return `M ${CX - rx},${CY} A ${rx},${ry} 0 0,1 ${CX + rx},${CY}`;
}
function frontArcPath(rx, ry) {
  return `M ${CX + rx},${CY} A ${rx},${ry} 0 0,1 ${CX - rx},${CY}`;
}
// Full ellipse path for animateMotion
function fullEllipsePath(rx, ry) {
  return `M ${CX - rx},${CY} A ${rx},${ry} 0 0,1 ${CX + rx},${CY} A ${rx},${ry} 0 0,1 ${CX - rx},${CY}`;
}

function GlowFilter({ id, color }) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
      <feColorMatrix
        in="blur"
        type="matrix"
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
        result="glow"
      />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

function OrbitArc({ rx, ry, tilt, color, front, idx }) {
  const pathD = front ? frontArcPath(rx, ry) : backArcPath(rx, ry);
  const filterId = `glow-${idx}-${front ? "f" : "b"}`;
  return (
    <g transform={`rotate(${tilt} ${CX} ${CY})`}>
      <defs>
        <filter id={filterId} x="-60%" y="-200%" width="220%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Glow layer */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="10"
        opacity="0.25"
        filter={`url(#${filterId})`}
      />
      {/* Core bright stroke */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        opacity="0.95"
      />
      {/* White hot center */}
      <path
        d={pathD}
        fill="none"
        stroke="white"
        strokeWidth="0.8"
        opacity="0.6"
      />
    </g>
  );
}

// Icon rendered as SVG group — shape variants
function IconBadge({ label, fill, textColor, shape, x, y }) {
  const R = 22;
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Glow behind icon */}
      <circle r={R + 8} fill={fill} opacity="0.15" />
      {shape === "square" && (
        <rect x={-R} y={-R} width={R * 2} height={R * 2} rx="6" fill={fill} />
      )}
      {shape === "hex" && (
        <polygon
          points={Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            return `${(R * Math.cos(a)).toFixed(1)},${(R * Math.sin(a)).toFixed(1)}`;
          }).join(" ")}
          fill={fill}
        />
      )}
      {shape === "react" && (
        <>
          <circle r={R} fill={fill} stroke="#00e676" strokeWidth="2" />
          <circle r="4" fill="#61DAFB" />
          <ellipse
            rx="13"
            ry="5"
            fill="none"
            stroke="#61DAFB"
            strokeWidth="1.5"
          />
          <ellipse
            rx="13"
            ry="5"
            fill="none"
            stroke="#61DAFB"
            strokeWidth="1.5"
            transform="rotate(60)"
          />
          <ellipse
            rx="13"
            ry="5"
            fill="none"
            stroke="#61DAFB"
            strokeWidth="1.5"
            transform="rotate(120)"
          />
        </>
      )}
      {(shape === "square" || shape === "hex") && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={label.length > 2 ? "10" : "13"}
          fontWeight="bold"
          fontFamily="monospace"
          fill={textColor}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// An icon that travels the full orbit, clipped to back or front half
function OrbitIcon({
  orbitIdx,
  dur,
  begin,
  label,
  fill,
  textColor,
  shape,
  front,
}) {
  const [rx, ry, tilt] = ORBITS[orbitIdx];
  const motionPath = fullEllipsePath(rx, ry);
  const clipId = `clip-${orbitIdx}-${front ? "front" : "back"}`;
  // Clip to bottom half (y > CY) for front, top half (y < CY) for back
  const clipRect = front
    ? `<rect x="0" y="${CY}" width="800" height="${640 - CY + 20}"/>`
    : `<rect x="0" y="0" width="800" height="${CY}"/>`;
  const R = 22;

  return (
    <g transform={`rotate(${tilt} ${CX} ${CY})`}>
      <defs>
        <clipPath id={clipId}>
          <rect
            x="-70"
            y={front ? CY : 0}
            width="960"
            height={front ? 640 - CY + 20 : CY}
          />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <g>
          <animateMotion
            dur={dur}
            begin={begin}
            repeatCount="indefinite"
            rotate="none"
          >
            <mpath href={`#mp-${orbitIdx}`} />
          </animateMotion>
          <IconBadge
            label={label}
            fill={fill}
            textColor={textColor}
            shape={shape}
            x={0}
            y={0}
          />
        </g>
      </g>
    </g>
  );
}

export default function Lander() {
  return (
    <section className="lander">
      <div className="lander__inner">
        {/* ── LEFT TEXT ── */}
        <div className="lander__text">
          <p className="lander__hi">Hi, I'm</p>
          <h1 className="lander__name">Saurabh Pandey</h1>
          <h2 className="lander__role">Software Developer</h2>
          <p className="lander__desc">
            Crafting code to build creative and efficient solutions.
          </p>
          <div className="lander__cta">
            <button className="lbtn lbtn--fill">View My Work</button>
            <button className="lbtn lbtn--outline">Contact Me</button>
          </div>
        </div>

        {/* ── RIGHT STAGE ── */}
        <div className="lander__stage">
          {/*
            THREE-LAYER APPROACH:
            ┌─────────────────────────────────────┐
            │ SVG Layer 1: Back arcs + back icons  │  z-index: 1
            ├─────────────────────────────────────┤
            │ IMG: Monk (position:absolute center) │  z-index: 2
            ├─────────────────────────────────────┤
            │ SVG Layer 2: Front arcs + front icons│  z-index: 3
            └─────────────────────────────────────┘
            All 3 share identical size + viewBox so they align perfectly.
          */}

          {/* ── LAYER 1: Back arcs (behind monk) ── */}
          <svg
            className="lander__svg lander__svg--back"
            viewBox="0 0 800 640"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Motion paths — defined here, referenced by both layers via #id */}
              {ORBITS.map(([rx, ry, tilt], i) => (
                <path
                  key={i}
                  id={`mp-${i}`}
                  fill="none"
                  stroke="none"
                  d={fullEllipsePath(rx, ry)}
                  transform={`rotate(${tilt} ${CX} ${CY})`}
                />
              ))}
            </defs>

            {/* Back arcs (upper half of each ellipse) */}
            {ORBITS.map(([rx, ry, tilt, col], i) => (
              <OrbitArc
                key={i}
                rx={rx}
                ry={ry}
                tilt={tilt}
                color={col}
                front={false}
                idx={i}
              />
            ))}

            {/* Back icons: clipped to upper half → hide when on front arc */}
            {ICONS.map(([oi, dur, begin, label, fill, tc, shape], i) => (
              <OrbitIcon
                key={i}
                orbitIdx={oi}
                dur={`${dur}s`}
                begin={begin}
                label={label}
                fill={fill}
                textColor={tc}
                shape={shape}
                front={false}
              />
            ))}
          </svg>

          {/* ── LAYER 2: Monk image ── */}
          <img className="lander__monk" src={monkImg} alt="monk" />

          {/* ── LAYER 3: Front arcs (in front of monk) ── */}
          <svg
            className="lander__svg lander__svg--front"
            viewBox="0 0 800 640"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Front arcs (lower half of each ellipse) */}
            {ORBITS.map(([rx, ry, tilt, col], i) => (
              <OrbitArc
                key={i}
                rx={rx}
                ry={ry}
                tilt={tilt}
                color={col}
                front={true}
                idx={i}
              />
            ))}

            {/* Front icons: clipped to lower half → hide when on back arc */}
            {ICONS.map(([oi, dur, begin, label, fill, tc, shape], i) => (
              <OrbitIcon
                key={i}
                orbitIdx={oi}
                dur={`${dur}s`}
                begin={begin}
                label={label}
                fill={fill}
                textColor={tc}
                shape={shape}
                front={true}
              />
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
