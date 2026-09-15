// @signature edufertanapo
import type { SceneAsset, VerbRule } from '../types/domain';

type AssetVisualProps = {
  asset: Pick<SceneAsset, 'id' | 'label' | 'category'> & { openState?: 'open' | 'closed' };
  size?: number;
  className?: string;
};

export function AssetVisual({ asset, size = 72, className = '' }: AssetVisualProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 100 100',
    role: 'img',
    'aria-label': asset.label,
    className: `asset-svg ${className}`,
  };

  if (asset.category === 'person') {
    return (
      <svg {...common}>
        <g className="person-figure">
          <circle cx="50" cy="22" r="11" fill="currentColor" opacity=".14" />
          <circle cx="50" cy="22" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle className="person-eye" cx="54" cy="19" r="1.7" fill="currentColor" />
          <path className="person-mouth-closed" d="M53 27 Q57 29 60 26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path className="person-mouth-open" d="M53 25 L61 29 L53 33 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M50 34 L50 64 M50 44 L32 54 M50 44 L68 54 M50 64 L36 88 M50 64 L64 88" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  switch (asset.id) {
    case 'ball':
      return (
        <svg {...common}>
          <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M50 22 L60 39 L52 55 L33 56 L25 41 M60 39 L77 43 M52 55 L61 73 M33 56 L28 72" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'cup':
      return (
        <svg {...common}>
          <path d="M30 30 H65 L61 74 H34 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M65 39 C82 39 82 61 63 61" fill="none" stroke="currentColor" strokeWidth="4" />
        </svg>
      );
    case 'water':
      return (
        <svg {...common}>
          <path d="M50 18 C50 18 28 45 28 60 C28 75 38 84 50 84 C62 84 72 75 72 60 C72 45 50 18 50 18 Z" fill="none" stroke="currentColor" strokeWidth="4" />
        </svg>
      );
    case 'food':
      return (
        <svg {...common}>
          <ellipse cx="50" cy="61" rx="30" ry="14" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M34 52 C36 39 44 35 50 35 C58 35 66 41 67 52" fill="none" stroke="currentColor" strokeWidth="4" />
        </svg>
      );
    case 'chair':
      return (
        <svg {...common}>
          <path d="M34 25 V60 H68 M34 48 H66 V76 M40 60 V82 M65 60 V82" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'sofa':
      return (
        <svg {...common}>
          <path d="M23 46 C23 37 31 33 39 33 H61 C69 33 77 37 77 46 V70 H23 Z" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M18 49 V70 H82 V49 M30 70 V81 M70 70 V81" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'bed':
      return (
        <svg {...common}>
          <path d="M18 69 H82 M23 69 V39 H48 C63 39 73 45 78 55 V69 M23 69 V82 M78 69 V82" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <rect x="27" y="44" width="20" height="10" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    case 'key':
      return (
        <svg {...common}>
          <circle cx="36" cy="49" r="15" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M50 49 H82 M70 49 V61 M79 49 V57" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...common}>
          <rect x="31" y="18" width="38" height="64" rx="7" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="72" r="2" fill="currentColor" />
        </svg>
      );
    case 'yarn':
      return (
        <svg {...common}>
          <circle cx="48" cy="51" r="27" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M27 42 C45 28 66 32 70 48 C72 65 51 76 31 67 C19 61 19 48 27 42 Z M29 57 C43 67 58 68 69 57 M37 27 C45 38 61 41 73 37" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M70 66 C82 70 85 79 82 88" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'door':
      return (
        <svg {...common}>
          <rect x="24" y="14" width="52" height="72" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
          {asset.openState === 'open' ? (
            <path d="M27 17 L65 25 V79 L27 83 Z" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          ) : (
            <>
              <rect x="28" y="18" width="44" height="64" rx="1" fill="currentColor" fillOpacity=".05" stroke="currentColor" strokeWidth="3" />
              <circle cx="62" cy="51" r="3" fill="currentColor" />
            </>
          )}
        </svg>
      );
    case 'plate':
      return (
        <svg {...common}>
          <circle cx="50" cy="52" r="28" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="52" r="17" fill="none" stroke="currentColor" strokeWidth="3" opacity=".6" />
        </svg>
      );
    case 'clothes':
      return (
        <svg {...common}>
          <path d="M35 24 L22 36 L32 47 L38 41 V80 H62 V41 L68 47 L78 36 L65 24 L58 31 H42 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      );
    case 'money':
      return (
        <svg {...common}>
          <rect x="18" y="30" width="64" height="40" rx="5" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M24 38 C31 38 34 35 34 34 M76 62 C69 62 66 65 66 66" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    case 'toothbrush':
      return (
        <svg {...common}>
          <path d="M24 66 L66 28" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          <path d="M65 28 L79 22 M62 33 L76 27 M59 38 L73 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'soap':
      return (
        <svg {...common}>
          <rect x="24" y="34" width="52" height="34" rx="14" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="68" cy="25" r="5" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="78" cy="16" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'towel':
      return (
        <svg {...common}>
          <rect x="28" y="20" width="44" height="62" rx="3" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M28 36 H72 M28 65 H72" fill="none" stroke="currentColor" strokeWidth="3" opacity=".6" />
        </svg>
      );
    case 'bag':
      return (
        <svg {...common}>
          <path d="M25 38 H75 L70 78 H30 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M38 38 C38 22 62 22 62 38" fill="none" stroke="currentColor" strokeWidth="4" />
        </svg>
      );
    case 'dog':
      return (
        <svg {...common}>
          <circle cx="50" cy="42" r="20" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M34 29 L23 20 L27 42 M66 29 L77 20 L73 42 M43 48 Q50 54 57 48 M50 62 V78 M38 78 H62" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="43" cy="39" r="2.5" fill="currentColor" />
          <circle cx="57" cy="39" r="2.5" fill="currentColor" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}>
          <path d="M18 48 L50 22 L82 48 V80 H58 V58 H42 V80 H18 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      );
    case 'living_room':
      return (
        <svg {...common}>
          <path d="M13 18 H87 V84 H13 Z" fill="currentColor" fillOpacity=".035" stroke="currentColor" strokeWidth="3" />
          <path d="M25 51 C25 43 32 39 40 39 H60 C68 39 75 43 75 51 V70 H25 Z M19 53 V70 H81 V53 M31 70 V78 M69 70 V78" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <rect x="37" y="75" width="26" height="5" rx="2" fill="currentColor" opacity=".18" />
        </svg>
      );
    case 'bedroom':
      return (
        <svg {...common}>
          <path d="M13 18 H87 V84 H13 Z" fill="currentColor" fillOpacity=".035" stroke="currentColor" strokeWidth="3" />
          <path d="M21 68 H79 M25 68 V42 H48 C63 42 72 48 76 57 V68 M25 68 V78 M76 68 V78" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <rect x="29" y="46" width="19" height="9" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    case 'kitchen':
      return (
        <svg {...common}>
          <path d="M13 18 H87 V84 H13 Z" fill="currentColor" fillOpacity=".035" stroke="currentColor" strokeWidth="3" />
          <path d="M20 50 H80 V78 H20 Z M50 50 V78 M20 61 H80" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="34" cy="42" r="9" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M43 42 H55 M59 32 H77 V50 H59 Z M63 37 H73" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'bathroom':
      return (
        <svg {...common}>
          <path d="M13 18 H87 V84 H13 Z" fill="currentColor" fillOpacity=".035" stroke="currentColor" strokeWidth="3" />
          <path d="M22 34 H47 V49 H22 Z M34 49 V58 M25 58 H44 M61 27 V44 C61 56 75 56 75 44 V40 M57 27 H69" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M57 47 L53 54 M64 49 L61 57 M71 48 L70 56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M27 68 H50 C50 78 43 82 36 82 C29 82 27 76 27 68 Z" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    case 'street':
      return (
        <svg {...common}>
          <path d="M18 84 L37 18 H63 L82 84 Z" fill="currentColor" fillOpacity=".04" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          <path d="M50 24 V35 M50 44 V55 M50 64 V78 M11 69 H29 M71 69 H89" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'church':
      return (
        <svg {...common}>
          <path d="M27 82 V43 L50 29 L73 43 V82 Z M50 17 V29 M43 21 H57 M44 82 V59 H56 V82" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'market':
      return (
        <svg {...common}>
          <path d="M21 34 H79 L72 76 H29 Z M27 34 L34 22 M73 34 L66 22" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
          <path d="M34 48 H66 M32 61 H69" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="21" y="21" width="58" height="58" rx="14" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="50" cy="50" r="8" fill="currentColor" opacity=".35" />
        </svg>
      );
  }
}

export function VerbVisual({ verb, size = 76, animated = false }: { verb: VerbRule; size?: number; animated?: boolean }) {
  return (
    <div className={`verb-visual verb-${verb.id} ${animated ? 'is-animated' : ''}`} style={{ width: size, height: size }} aria-label={verb.label}>
      <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
        <g className="verb-person">
          <circle className="verb-head" cx="32" cy="25" r="8" />
          <circle className="verb-face-eye" cx="35" cy="23" r="1.3" />
          <path className="verb-mouth-closed" d="M35 28 Q38 30 41 27" />
          <path className="verb-mouth-open" d="M35 26 L42 30 L35 34 Z" />
          <path className="verb-body" d="M32 34 L32 60 M32 43 L20 52 M32 43 L44 52 M32 60 L22 79 M32 60 L42 79" />
        </g>
        <circle className="verb-object" cx="72" cy="58" r="9" />
        <path className="verb-arrow" d="M50 50 H76 M67 42 L76 50 L67 58" />
        <path className="verb-seat" d="M60 49 V72 H82 M66 72 V84 M81 72 V84" />
        <path className="verb-cup" d="M65 49 H82 L80 68 H67 Z" />
        <path className="verb-eye" d="M55 34 C64 24 78 24 87 34 C78 44 64 44 55 34 Z M71 34 A4 4 0 1 0 79 34 A4 4 0 1 0 71 34" />
        <path className="verb-speech" d="M54 20 H88 V42 H70 L61 50 V42 H54 Z" />
        <path className="verb-door" d="M58 20 H86 V78 H58 Z M77 49 H80" />
        <path className="verb-return" d="M84 28 C65 22 54 31 54 48 M54 48 L64 38 M54 48 L64 58" />
      </svg>
    </div>
  );
}
