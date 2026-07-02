/** AppDrop brand mark — a download/OTA glyph on the accent tile. */
export default function Logo({
  className = "h-9 w-9",
  icon = "h-5 w-5",
}: {
  className?: string;
  icon?: string;
}) {
  return (
    <span
      className={`grid ${className} shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset]`}
    >
      <svg
        className={icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 3v11" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 20h14" />
      </svg>
    </span>
  );
}
