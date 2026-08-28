'use client'

export default function StaticHeroFallback() {
  return (
    <div className="w-full h-[80vh] flex items-center justify-center relative overflow-hidden bg-[var(--bg-paper)]">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-90 max-w-2xl mx-auto"
      >
        {/* 7 stacked sheets, offset slightly on X/Y to fake 3D */}
        {[...Array(7)].map((_, i) => (
          <rect
            key={i}
            x={150 + i * 15}
            y={50 + i * 12}
            width="320"
            height="440"
            fill="var(--surface)"
            fillOpacity="0.85"
            stroke="var(--hairline)"
            strokeWidth="1"
            style={{ filter: "drop-shadow(4px 4px 10px rgba(0,0,0,0.03))" }}
          />
        ))}

        {/* Aligned Grid Lines in the center */}
        <g stroke="var(--ink)" strokeWidth="1" strokeOpacity="0.15">
          {[...Array(15)].map((_, i) => (
            <line key={i} x1="100" y1={100 + i * 25} x2="600" y2={100 + i * 25} />
          ))}
        </g>
      </svg>
    </div>
  )
}
