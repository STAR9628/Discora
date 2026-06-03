import { Bell, CirclePlus, Home, Search, User } from "lucide-react";

const mobileItems = [
  { label: "Home", icon: Home },
  { label: "Search", icon: Search },
  { label: "Create", icon: CirclePlus },
  { label: "Notifications", icon: Bell },
  { label: "Profile", icon: User },
] as const;

export function MobileNav() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {mobileItems.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.label}>
              <button
                type="button"
                className="flex h-16 w-full flex-col items-center justify-center gap-1 text-muted-foreground"
              >
                <Icon aria-hidden="true" className="h-5 w-5" />
                <span className="text-[11px] leading-none">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
