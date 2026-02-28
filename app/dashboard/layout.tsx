import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/actions";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <div className="flex items-center gap-2 border-b px-6 py-3">
          <SidebarTrigger />
        </div>
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
