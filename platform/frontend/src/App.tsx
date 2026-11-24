import { ProjectPage } from "@/pages/Project";
import { Projects } from "@/pages/Projects";
import { Settings } from "@/pages/Settings";
import { TITLE } from "@/lib/format";
import { href, useRoute } from "@/lib/route";
import { cn } from "@/lib/utils";

export function App() {
  const route = useRoute();
  const nav = (to: string, label: string, active: boolean) => (
    <a
      href={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full items-center border-b-2 border-transparent px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground",
        active && "border-primary font-semibold text-primary",
      )}
    >
      {label}
    </a>
  );
  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border bg-card px-5">
        <a href={href.projects} className="flex items-center gap-2.5 text-[13.5px] font-bold tracking-[-0.02em] text-foreground">
          <span className="grid size-6 place-items-center rounded-md bg-foreground font-mono text-[10.5px] font-semibold text-white">
            R→P
          </span>
          {TITLE}
        </a>
        <span className="h-4.5 w-px bg-border" aria-hidden />
        <nav className="flex h-full items-center gap-1">
          {nav(href.projects, "Projects", route.page !== "settings")}
          {nav(href.settings, "Settings", route.page === "settings")}
        </nav>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {route.page === "projects" && <Projects />}
        {route.page === "settings" && <Settings />}
        {route.page === "project" && <ProjectPage key={route.id} pid={route.id} step={route.step} />}
      </main>
    </div>
  );
}
