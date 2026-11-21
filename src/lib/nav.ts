import type { IconName } from "@/components/Icon";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Показывать в нижней панели на телефоне; остальное уходит в «Ещё». */
  primary: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "dashboard", primary: true },
  { href: "/planner", label: "Planner", icon: "calendar", primary: true },
  { href: "/timer", label: "Таймер", icon: "timer", primary: true },
  { href: "/habits", label: "Привычки", icon: "habits", primary: true },
  { href: "/journal", label: "Журнал", icon: "journal", primary: false },
  { href: "/review", label: "Повторение", icon: "reset", primary: false },
  { href: "/analytics", label: "Статистика", icon: "dashboard", primary: false },
  { href: "/vault", label: "Vault", icon: "vault", primary: false },
  { href: "/studyos", label: "StudyOS", icon: "studyos", primary: false },
  { href: "/mathlab", label: "MathLab", icon: "mathlab", primary: false },
  { href: "/knowledge-map", label: "Knowledge Map", icon: "map", primary: false },
  { href: "/settings", label: "Данные и синхронизация", icon: "settings", primary: false },
];
