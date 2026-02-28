"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Organization, OrganizationMember } from "@/types/database";
import { Button } from "@/components/ui/button";
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("organizations")
      .update({ name, slug })
      .eq("id", org.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess("Organization updated successfully.");
      setOrg({ ...org, name, slug });
    }
    setSaving(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    const supabase = createClient();
    const { data, error: createError } = await supabase.rpc("create_org_with_owner", {
      org_name: newOrgName,
      org_slug: newOrgSlug,
    });

    if (createError) {
      setError(createError.message);
    } else {
      localStorage.setItem("currentOrgId", data);
      setNewOrgName("");
      setNewOrgSlug("");
      loadOrg();
    }
    setCreating(false);
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
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
                {error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-700">
                    {success}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug">Slug</Label>
                  <Input
                    id="org-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
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
                <p className="text-sm text-muted-foreground">No members found.</p>
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
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-org-name">Organization Name</Label>
                <Input
                  id="new-org-name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="My Agency"
                  required
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
                />
                <p className="text-xs text-muted-foreground">
                  URL-friendly identifier. Use lowercase letters, numbers, and hyphens.
                </p>
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Organization"}
              </Button>
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  );
}
