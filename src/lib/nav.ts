import type { IconName } from "@/components/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/expenses", label: "Expenses", icon: "wallet" },
  { href: "/money-owed", label: "Money Owed", icon: "coins" },
  { href: "/analytics", label: "Analytics", icon: "chart" },
];

export const secondaryNav: NavItem[] = [
  { href: "/people", label: "People", icon: "users" },
  { href: "/budgets", label: "Budgets", icon: "target" },
];

export const allNav: NavItem[] = [...primaryNav, ...secondaryNav];