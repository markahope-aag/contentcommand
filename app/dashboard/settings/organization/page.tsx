"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeString, sanitizeSlug } from "@/lib/sanitize";
import type { Organization, OrganizationMember } from "@/types/database";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function OrganizationSettingsPage() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadOrg();
  }, []);

  async function loadOrg() {
    const supabase = createClient();
    const orgId = typeof window !== "undefined"
      ? localStorage.getItem("currentOrgId")
      : null;

    if (orgId) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

      if (orgData) {
        setOrg(orgData);
        setName(orgData.name);
        setSlug(orgData.slug);

        const { data: memberData } = await supabase
          .from("organization_members")
          .select("*")
          .eq("org_id", orgId)
          .order("created_at", { ascending: true });

        if (memberData) setMembers(memberData);
      }
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);

    const cleanName = sanitizeString(name);
    const cleanSlug = sanitizeSlug(slug);

    if (!cleanName || !cleanSlug) {
      toast({ title: "Validation error", description: "Name and slug are required.", variant: "destructive" });
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ name: cleanName, slug: cleanSlug })
      .eq("id", org.id);

    if (updateError) {
      toast({ title: "Update failed", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Organization updated", description: "Your changes have been saved." });
      setOrg({ ...org, name: cleanName, slug: cleanSlug });
    }
    setSaving(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    const cleanName = sanitizeString(newOrgName);
    const cleanSlug = sanitizeSlug(newOrgSlug);

    if (!cleanName || !cleanSlug) {
      toast({ title: "Validation error", description: "Name and slug are required.", variant: "destructive" });
      setCreating(false);
      return;
    }

    const supabase = createClient();
    const { data, error: createError } = await supabase.rpc("create_org_with_owner", {
      org_name: cleanName,
      org_slug: cleanSlug,
    });

    if (createError) {
      toast({ title: "Creation failed", description: createError.message, variant: "destructive" });
    } else {
      toast({ title: "Organization created", description: `${cleanName} is ready to use.` });
      localStorage.setItem("currentOrgId", data);
      setNewOrgName("");
      setNewOrgSlug("");
      loadOrg();
    }
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-9 w-56" />
        <div className="rounded-lg border p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Organization Settings</h1>

      {org ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Update your organization name and slug.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug">Slug</Label>
                  <Input
                    id="org-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <LoadingButton type="submit" loading={saving} loadingText="Saving...">
                  Save Changes
                </LoadingButton>
              </CardContent>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                People with access to this organization and its clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No members found. Invite team members to collaborate.
                </p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <span className="text-sm font-mono">{member.user_id}</span>
                      <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Create Organization</CardTitle>
            <CardDescription>
              You don&apos;t have an organization yet. Create one to get started.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-org-name">Organization Name</Label>
                <Input
                  id="new-org-name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="My Agency"
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-org-slug">Slug</Label>
                <Input
                  id="new-org-slug"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                  placeholder="my-agency"
                  required
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  URL-friendly identifier. Use lowercase letters, numbers, and hyphens.
                </p>
              </div>
              <LoadingButton type="submit" loading={creating} loadingText="Creating...">
                Create Organization
              </LoadingButton>
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  );
}
