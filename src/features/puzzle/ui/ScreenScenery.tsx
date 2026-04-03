import type { ScreenSceneVariant } from "./screenArtDirection";

type ScreenSceneryProps = {
  variant: ScreenSceneVariant;
  className?: string;
};

type SceneryLayout = {
  orbGlow: { x: number; y: number; r: number };
  orb: { x: number; y: number; r: number };
  haze: { x: number; y: number; rx: number; ry: number };
};

const SCENERY_LAYOUTS: Record<ScreenSceneVariant, SceneryLayout> = {
  dawn: {
    orbGlow: { x: 286, y: 156, r: 78 },
    orb: { x: 286, y: 156, r: 40 },
    haze: { x: 338, y: 214, rx: 228, ry: 58 }
  },
  dusk: {
    orbGlow: { x: 324, y: 170, r: 84 },
    orb: { x: 324, y: 170, r: 44 },
    haze: { x: 382, y: 228, rx: 242, ry: 64 }
  },
  night: {
    orbGlow: { x: 918, y: 148, r: 64 },
    orb: { x: 918, y: 148, r: 34 },
    haze: { x: 866, y: 198, rx: 196, ry: 50 }
  }
};

export function ScreenScenery({ variant, className = "" }: ScreenSceneryProps) {
  const layout = SCENERY_LAYOUTS[variant];

  return (
    <div className={["screen-scenery", `screen-scenery-${variant}`, className].join(" ").trim()} aria-hidden="true">
      <svg viewBox="0 0 1200 900" preserveAspectRatio="none" focusable="false">
        <circle className="screen-scenery-orb-glow" cx={layout.orbGlow.x} cy={layout.orbGlow.y} r={layout.orbGlow.r} />
        <circle className="screen-scenery-orb" cx={layout.orb.x} cy={layout.orb.y} r={layout.orb.r} />
        <ellipse
          className="screen-scenery-haze"
          cx={layout.haze.x}
          cy={layout.haze.y}
          rx={layout.haze.rx}
          ry={layout.haze.ry}
        />

        <path
          className="screen-scenery-ridge screen-scenery-ridge-back"
          d="M0 486 C 110 422, 226 448, 316 398 C 406 348, 516 368, 600 420 C 690 474, 796 478, 902 432 C 1004 388, 1106 400, 1200 452 L1200 900 L0 900 Z"
        />
        <path
          className="screen-scenery-ridge screen-scenery-ridge-mid"
          d="M0 588 C 132 540, 242 578, 352 528 C 458 482, 560 520, 650 580 C 748 642, 862 652, 966 608 C 1060 566, 1134 574, 1200 606 L1200 900 L0 900 Z"
        />
        <path
          className="screen-scenery-ridge screen-scenery-ridge-front"
          d="M0 676 C 122 646, 234 698, 346 656 C 452 618, 562 658, 650 706 C 738 752, 864 762, 976 726 C 1078 692, 1146 700, 1200 722 L1200 900 L0 900 Z"
        />

        <path className="screen-scenery-spire screen-scenery-spire-left" d="M132 688 170 508 214 688 Z" />
        <path className="screen-scenery-spire screen-scenery-spire-left-small" d="M226 704 252 584 282 704 Z" />
        <path className="screen-scenery-spire screen-scenery-spire-right" d="M980 702 1020 520 1064 702 Z" />
        <path className="screen-scenery-spire screen-scenery-spire-right-small" d="M904 714 930 606 962 714 Z" />

        <circle className="screen-scenery-star screen-scenery-star-a" cx="368" cy="120" r="3.4" />
        <circle className="screen-scenery-star screen-scenery-star-b" cx="828" cy="110" r="2.7" />
        <circle className="screen-scenery-star screen-scenery-star-c" cx="948" cy="168" r="2.3" />
      </svg>
    </div>
  );
}
