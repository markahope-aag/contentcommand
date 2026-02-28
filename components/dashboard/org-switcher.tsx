"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Organization } from "@/types/database";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Plus, Building2 } from "lucide-react";

export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function loadOrgs() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrgs(data);
        const orgId = searchParams.get("org");
        const savedOrgId = typeof window !== "undefined"
          ? localStorage.getItem("currentOrgId")
          : null;
        const targetId = orgId || savedOrgId;
        const match = data.find((o) => o.id === targetId) || data[0] || null;
        setCurrentOrg(match);
        if (match && typeof window !== "undefined") {
          localStorage.setItem("currentOrgId", match.id);
        }
      }
      setLoading(false);
    }
    loadOrgs();
  }, [searchParams]);

  function switchOrg(org: Organization) {
    setCurrentOrg(org);
    if (typeof window !== "undefined") {
      localStorage.setItem("currentOrgId", org.id);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("org", org.id);
    router.push(`${pathname}?${params.toString()}`);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={() => router.push("/dashboard/settings/organization")}
      >
        <Plus className="h-4 w-4" />
        Create Organization
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between gap-2">
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">{currentOrg?.name ?? "Select org"}</span>
          </span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrg(org)}
            className={org.id === currentOrg?.id ? "bg-accent" : ""}
          >
            <Building2 className="mr-2 h-4 w-4" />
            {org.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings/organization")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
