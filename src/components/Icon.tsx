export type IconName =
  | "dashboard" | "vault" | "studyos" | "mathlab" | "map"
  | "calendar" | "timer" | "journal" | "habits" | "more"
  | "edit" | "check" | "play" | "pause" | "reset" | "skip" | "chevronLeft" | "chevronRight"
  | "sun" | "moon" | "plus" | "trash" | "x" | "settings" | "cloud";
const PATHS: Record<IconName, string> = {
  timer: "M12 22a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 9v4l2.5 2.5M9 2h6",
  journal: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  habits: "M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  check: "M20 6L9 17l-5-5",
  play: "M5 3l14 9-14 9V3z",
  pause: "M6 4h4v16H6zM14 4h4v16h-4z",
  reset: "M1 4v6h6M3.5 15a9 9 0 1 0 2.1-9.4L1 10",
  skip: "M5 4l10 8-10 8V4zM19 5v14",
  chevronLeft: "M15 18l-6-6 6-6",
  chevronRight: "M9 18l6-6-6-6",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2z",
  dashboard: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  vault: "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2zM4 19.5A2.5 2.5 0 0 1 6.5 17H20",
  studyos: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  mathlab: "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h8",
  map: "M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6",
  x: "M18 6L6 18M6 6l12 12",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.5 2.6-.2-.1a1.7 1.7 0 0 0-1.8.2l-.1.1h-3l-.1-.2a1.7 1.7 0 0 0-1.5-1l-.2.1-2.6-1.5.1-.2a1.7 1.7 0 0 0-.2-1.8l-.1-.1v-3l.2-.1a1.7 1.7 0 0 0 1-1.5l-.1-.2 1.5-2.6.2.1a1.7 1.7 0 0 0 1.8-.2l.1-.1h3l.1.2a1.7 1.7 0 0 0 1.5 1l.2-.1 2.6 1.5-.1.2a1.7 1.7 0 0 0 .2 1.8l.1.1v3l-.2.1a1.7 1.7 0 0 0-1 1.5z",
  cloud: "M20 16.2A4.5 4.5 0 0 0 18 7.5a6 6 0 0 0-11.5 1.8A3.8 3.8 0 0 0 7 17h12",
};

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
