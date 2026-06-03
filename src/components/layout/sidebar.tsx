import { Bell, Home, MessageSquare, Scale, User } from "lucide-react";

const sidebarItems = [
  { label: "Home", icon: Home },
  { label: "Discussions", icon: MessageSquare },
  { label: "Debates", icon: Scale },
  { label: "Notifications", icon: Bell },
  { label: "Profile", icon: User },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card/40 px-3 py-4 md:block">
      <div className="px-3 py-2">
        <p className="text-lg font-semibold">Discora</p>
        <p className="text-xs text-muted-foreground">Understanding over engagement</p>
      </div>
      <nav aria-label="Primary navigation" className="mt-6">
        <ul className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;

            return (
              <li key={item.label}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
