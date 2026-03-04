"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Clients", href: "/dashboard/clients", icon: "👥" },
  { name: "Existing Content", href: "/dashboard/existing-content", icon: "📄" },
  { name: "Competitive Intel", href: "/dashboard/competitive-intelligence", icon: "🎯" },
  { name: "Briefs", href: "/dashboard/content", icon: "📝" },
  { name: "Content Creation", href: "/dashboard/content/creation", icon: "✨" },
  { name: "Analytics", href: "/dashboard/analytics", icon: "📈" },
  { name: "Integrations", href: "/dashboard/integrations", icon: "🔌" },
  { name: "Settings", href: "/dashboard/settings", icon: "⚙️" },
  { name: "API Docs", href: "/docs", icon: "📚" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4 space-y-3">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          <Image src="/logo.svg" alt="" width={24} height={24} />
          <span className="text-lg font-bold">Content Command</span>
        </Link>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                    >
                      <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                        <span aria-hidden="true">{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <form action={signOut}>
          <Button variant="outline" className="w-full" type="submit">
            Sign out
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
