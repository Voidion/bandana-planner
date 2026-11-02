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

/* filled shapes (timer controls) */
const F = (children: React.ReactNode) =>
  function Icon({ size = 16, color }: P) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
        {children}
      </Svg>
    );
  };
export const PlayIcon = F(<Path d="M8 5.5v13l10.5-6.5z" />);
export const StopIcon = F(<Rect x="6" y="6" width="12" height="12" rx="2" />);
export const PauseIcon = F(
  <>
    <Rect x="6.5" y="5" width="4" height="14" rx="1.2" />
    <Rect x="13.5" y="5" width="4" height="14" rx="1.2" />
  </>,
);
export const BoxIcon = I(
  <>
    <Path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
    <Path d="M3.5 7.5 12 12l8.5-4.5" />
    <Path d="M12 12v9" />
  </>,
);
export const WorkflowIcon = I(
  <>
    <Path d="M3.5 6.5l2 2 3.5-3.5" />
    <Path d="M3.5 13l2 2 3.5-3.5" />
    <Path d="M3.5 19.5h2.2" />
    <Path d="M12.5 6.5H21" />
    <Path d="M12.5 13H21" />
    <Path d="M9.5 19.5H21" />
  </>,
);
export const EditIcon = I(
  <>
    <Path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" />
    <Path d="M14.5 6.5l3 3" />
  </>,
);
export const ClockIcon = I(
  <>
    <Circle cx="12" cy="12" r="8.5" />
    <Path d="M12 7.5V12l3 2" />
  </>,
);
export const CalIcon = I(
  <>
    <Rect x="4" y="5" width="16" height="15" rx="2" />
    <Path d="M4 10h16M9 3v4M15 3v4" />
  </>,
);
export const DefectIcon = I(
  <>
    <Path d="M12 8.6v4.6" />
    <Path d="M12 16.6h.01" />
    <Path d="M10.3 4.2 2.9 17.4A1.9 1.9 0 0 0 4.6 20.2h14.8a1.9 1.9 0 0 0 1.7-2.8L13.7 4.2a1.9 1.9 0 0 0-3.4 0Z" />
  </>,
);
export const GearIcon = I(
  <>
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </>,
);
export const UpIcon = I(<Path d="M6.5 14.5 12 9l5.5 5.5" />);
export const DownIcon = I(<Path d="M6.5 9.5 12 15l5.5-5.5" />);
export const CartIcon = I(
  <>
    <Path d="M3.5 4.5h2.2l2 10.5h10.6l1.9-7.5H7" />
    <Circle cx="9.5" cy="19" r="1.4" />
    <Circle cx="17" cy="19" r="1.4" />
  </>,
);
export const StoreIcon = I(
  <>
    <Path d="M4 9.5 5.5 4.5h13L20 9.5" />
    <Path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
    <Path d="M5.5 11.5v8h13v-8M10 19.5v-5h4v5" />
  </>,
);
export const TagIcon = I(
  <>
    <Path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1.4 1.4 0 0 1 0 2l-6.8 6.8a1.4 1.4 0 0 1-2 0z" />
    <Circle cx="8" cy="8" r="1.5" />
  </>,
);
export const PeopleIcon = I(
  <>
    <Circle cx="9" cy="8.5" r="3.2" />
    <Path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
    <Path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.8c1.6.6 2.7 2.2 3 4.7" />
  </>,
);
export const SpoolIcon = I(
  <>
    <Rect x="6" y="3.5" width="12" height="3" rx="1" />
    <Rect x="6" y="17.5" width="12" height="3" rx="1" />
    <Path d="M8 6.5v11M16 6.5v11M8 9l8 2M8 12l8 2M8 15l8-1" />
  </>,
);
export const RestockIcon = I(
  <>
    <Path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L19.5 9" />
    <Path d="M19.5 4.5V9H15" />
    <Path d="M19.5 12a7.5 7.5 0 0 1-13 5.1L4.5 15" />
    <Path d="M4.5 19.5V15H9" />
  </>,
);
export const TruckIcon = I(
  <>
    <Path d="M3 6.5h11v9.5H3zM14 9.5h4l3 3.5v3h-7" />
    <Circle cx="7" cy="17.5" r="1.8" />
    <Circle cx="17.5" cy="17.5" r="1.8" />
  </>,
);
export const HomeIcon = I(<Path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />);
export const ChartIcon = I(<Path d="M4.5 19.5h15M7 16v-4M11 16V8M15 16v-6M19 16V5" />);
export const WrenchIcon = I(<Path d="M14.7 6.3a4 4 0 0 0-5.2 5.2L4.5 16.5a1.8 1.8 0 0 0 2.5 2.5l5-5a4 4 0 0 0 5.2-5.2l-2.4 2.4-2.1-.4-.4-2.1z" />);
export const PhotoIcon = I(
  <>
    <Rect x="3.5" y="5" width="17" height="14" rx="2.5" />
    <Circle cx="9" cy="10" r="1.6" />
    <Path d="m4 17 5-4.5 3.5 3 3-2.5L20 17" />
  </>,
);

/* Navigation icons, exactly as the prototype draws them (2px stroke where the prototype uses it). */
const I2 = (children: React.ReactNode, base = 2) =>
  function Icon({ size = 20, color, sw = base }: P) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </Svg>
    );
  };
export const TodayIcon = I2(<><Path d="M5 8.5h14L12 20z" /><Path d="M5 8.5 2.6 5.6M19 8.5l2.4-2.9" /><Path d="M8.4 8.5c1.4 2 5.8 2 7.2 0" /></>);
export const RunsIcon = I2(<><Path d="M12 3.5 21 8l-9 4.5L3 8z" /><Path d="M3 12l9 4.5 9-4.5" /><Path d="M3 16l9 4.5 9-4.5" /></>);
export const TimeIcon = I2(<><Circle cx="12" cy="13.5" r="7.5" /><Path d="M12 13.5l3.2-3.2" /><Path d="M10 2.8h4" /><Path d="M12 2.8V6" /></>);
export const TrendIcon = I2(<><Path d="M6.5 17v-4.5" /><Path d="M12 17V7.5" /><Path d="M17.5 17v-7" /><Path d="M4 20.5h16" /></>);
export const PriceIcon = I(<><Path d="M20 12.6l-7.4 7.4a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1-.6-1.4V5a1 1 0 0 1 1-1h7.6a2 2 0 0 1 1.4.6l6.8 6.8a1.6 1.6 0 0 1 0 1.2z" /><Circle cx="8.2" cy="8.2" r="1.3" /></>);
export const WalletIcon = I(<><Path d="M4.5 7.5h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" /><Path d="M4.5 7.5l10-3 1.2 3" /><Circle cx="15.8" cy="13.5" r="1.1" /></>);
export const CoinIcon = I(<><Circle cx="12" cy="12" r="8.2" /><Path d="M12 7.4v9.2" /><Path d="M14.3 9.7a2.3 2.3 0 0 0-2.3-1.3c-1.3 0-2.3.8-2.3 1.9s1 1.6 2.3 1.9 2.3.8 2.3 1.9-1 1.9-2.3 1.9a2.3 2.3 0 0 1-2.3-1.3" /></>);
export const ShelfIcon = I(<><Rect x="3.5" y="5" width="17" height="4.6" rx="1.6" /><Rect x="3.5" y="9.7" width="17" height="4.6" rx="1.6" /><Rect x="3.5" y="14.4" width="17" height="4.6" rx="1.6" /><Path d="M8.5 5v14" /></>);
export const DocIcon = I(<><Path d="M7 3.5h6.8L18 7.7V19.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" /><Path d="M13.5 3.5V8H18" /><Path d="M9 12.5h6M9 16h4" /></>);
export const PulseIcon = I(<Path d="M3.5 12h4l2.5-6 4 12 2.5-6h4" />);
export const BellIcon = I(<><Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><Path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>);
export const SplitIcon = I(<><Rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><Path d="M12 4.5v15" /></>);
export const SlidersIcon = I(<><Path d="M4 7.5h10M17.5 7.5H20" /><Path d="M4 16.5h3.5M11 16.5h9" /><Circle cx="15.75" cy="7.5" r="2.25" /><Circle cx="9.25" cy="16.5" r="2.25" /></>);
export const SunIcon = I(<><Circle cx="12" cy="12" r="4" /><Path d="M12 2.8v1.9M12 19.3v1.9M5.5 5.5l1.35 1.35M17.15 17.15l1.35 1.35M2.8 12h1.9M19.3 12h1.9M5.5 18.5l1.35-1.35M17.15 6.85l1.35-1.35" /></>);
export const MoonIcon = I(<Path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z" />);
export function AutoThemeIcon({ size = 20, color }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx="12" cy="12" r="8.25" />
      <Path d="M12 3.75a8.25 8.25 0 0 1 0 16.5z" fill={color} />
    </Svg>
  );
}
export function MoreIcon({ size = 22, color }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx="5.5" cy="12" r="1.7" />
      <Circle cx="12" cy="12" r="1.7" />
      <Circle cx="18.5" cy="12" r="1.7" />
    </Svg>
  );
}
export const BagIcon = I(<><Path d="M5.5 8h13l-1 11.5a1.5 1.5 0 0 1-1.5 1.4H8a1.5 1.5 0 0 1-1.5-1.4z" /><Path d="M9 10V7a3 3 0 0 1 6 0v3" /></>);
export const MailIcon = I(<><Rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><Path d="M4 7.5l8 5.5 8-5.5" /></>);
export const PhoneIcon = I(<Path d="M6.6 3.5h2.6l1.4 4-2 1.3a11 11 0 0 0 6.6 6.6l1.3-2 4 1.4v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" />);
export const AtIcon = I(<><Circle cx="12" cy="12" r="3.6" /><Path d="M15.6 12v1.4a2.4 2.4 0 0 0 4.8 0V12a8.4 8.4 0 1 0-3.3 6.7" /></>);
export const UserIcon = I(<><Circle cx="12" cy="8.5" r="3.8" /><Path d="M4.5 20c.9-3.6 3.9-5.8 7.5-5.8s6.6 2.2 7.5 5.8" /></>);
export const ChatIcon = I(<Path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />);
export const LockIcon = I(<><Rect x="5" y="10.5" width="14" height="10" rx="2.5" /><Path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /></>);
export const SwapIcon = I(<Path d="M7 7h12l-3-3M17 17H5l3 3" />);
export const DogIcon = I(<><Path d="M12 12.2c-2.6 0-4.6 2.5-4.6 4.6 0 1.6 1.2 2.4 2.5 2.4.9 0 1.4-.4 2.1-.4s1.2.4 2.1.4c1.3 0 2.5-.8 2.5-2.4 0-2.1-2-4.6-4.6-4.6z" /><Circle cx="5.8" cy="10.6" r="1.9" /><Circle cx="18.2" cy="10.6" r="1.9" /><Circle cx="9.2" cy="6" r="1.9" /><Circle cx="14.8" cy="6" r="1.9" /></>);
export const ReceiptIcon = I(<><Path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3z" /><Path d="M9 8.5h6M9 12h6M9 15.5h3.5" /></>);
export const GridIcon = I(<><Rect x="4" y="4" width="7" height="7" rx="1.5" /><Rect x="13" y="4" width="7" height="7" rx="1.5" /><Rect x="4" y="13" width="7" height="7" rx="1.5" /><Rect x="13" y="13" width="7" height="7" rx="1.5" /></>);
export const ListIcon = I(<><Path d="M9 6h11M9 12h11M9 18h11" /><Circle cx="5" cy="6" r="1.2" /><Circle cx="5" cy="12" r="1.2" /><Circle cx="5" cy="18" r="1.2" /></>);
export const AlbumsIcon = I(<><Rect x="4.5" y="9" width="15" height="11" rx="2.5" /><Path d="M6.5 6.2h11M8.5 3.5h7" /></>);
