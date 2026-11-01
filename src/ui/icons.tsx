/* Line icons from the prototype's set (24px grid, 1.8 stroke). */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type P = { size?: number; color: string; sw?: number };
const I = (children: React.ReactNode) =>
  function Icon({ size = 20, color, sw = 1.8 }: P) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </Svg>
    );
  };

export const FabricIcon = I(
  <>
    <Rect x="3.5" y="5" width="17" height="4.6" rx="1.6" />
    <Rect x="3.5" y="9.7" width="17" height="4.6" rx="1.6" />
    <Rect x="3.5" y="14.4" width="17" height="4.6" rx="1.6" />
  </>,
);
export const ScissorsIcon = I(
  <>
    <Circle cx="6.5" cy="7" r="2.5" />
    <Circle cx="6.5" cy="17" r="2.5" />
    <Path d="M8.6 8.4 20 17M8.6 15.6 20 7" />
  </>,
);
export const RulerIcon = I(
  <>
    <Rect x="2.8" y="8" width="18.4" height="8" rx="1.5" transform="rotate(-35 12 12)" />
    <Path d="M8.6 9.5l1.2 1.7M11.3 7.6l1.6 2.3M14 5.7l1.2 1.7M5.9 11.4l1.6 2.3" />
  </>,
);
export const PlusIcon = I(<Path d="M12 5v14M5 12h14" />);
export const CloseIcon = I(<Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />);
export const ChevIcon = I(<Path d="M9.5 5.5 16 12l-6.5 6.5" />);
export const CheckIcon = I(<Path d="M5 12.5l4.5 4.5L19 7.5" />);
export const TrashIcon = I(<Path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />);
export const WarnIcon = I(
  <>
    <Path d="M12 8.6v4.6M12 16.6h.01" />
    <Path d="M10.3 4.2 2.9 17.4A1.9 1.9 0 0 0 4.6 20.2h14.8a1.9 1.9 0 0 0 1.7-2.8L13.7 4.2a1.9 1.9 0 0 0-3.4 0z" />
  </>,
);
export const DownloadIcon = I(<Path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />);
export const SearchIcon = I(
  <>
    <Circle cx="11" cy="11" r="6.5" />
    <Path d="M20 20l-4.3-4.3" />
  </>,
);
export const UndoIcon = I(<Path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />);
export const FolderIcon = I(<Path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />);
export const BatchesIcon = I(
  <>
    <Path d="M4 6.5h16l-8 12z" />
    <Path d="M8.6 12.5h6.8" />
  </>,
);
