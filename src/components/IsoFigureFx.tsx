export const ISO_RIM_FILL = "#e8e4dc"

export function IsoFigureFx() {
  return (
    <svg className="iso-fx" aria-hidden focusable="false">
      <defs>
        <filter id="iso-hard-white" colorInterpolationFilters="sRGB">
          <feComponentTransfer in="SourceAlpha" result="hard">
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
          <feFlood floodColor={ISO_RIM_FILL} result="rim" />
          <feComposite in="rim" in2="hard" operator="in" />
        </filter>
        <filter id="iso-hard-black" colorInterpolationFilters="sRGB">
          <feComponentTransfer in="SourceAlpha" result="hard">
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
          <feColorMatrix
            in="hard"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
          />
        </filter>
      </defs>
    </svg>
  )
}
