export default function WarningIcon({ size = 14, color = '#C04830' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M12 2.5 L22 20.5 L2 20.5 Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      <path d="M12 9 L12 14" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="1.1" fill={color} />
    </svg>
  );
}
