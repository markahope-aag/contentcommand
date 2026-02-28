"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sanitizeString, sanitizeDomain, sanitizeStringArray } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Client } from "@/types/database";

export default function EditClientPage() {
  const params = useParams();
  const id = params.id as string;
  const [client, setClient] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadClient() {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setClient(data);
        setName(data.name);
        setDomain(data.domain);
        setIndustry(data.industry || "");
        const kws = Array.isArray(data.target_keywords)
          ? data.target_keywords.join(", ")
          : "";
        setKeywords(kws);
      }
    }
    loadClient();
  }, [id, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanName = sanitizeString(name);
    const cleanDomain = sanitizeDomain(domain);

    if (!cleanName || !cleanDomain) {
      setError("Name and domain are required.");
      setLoading(false);
      return;
    }

    const cleanIndustry = sanitizeString(industry) || null;
    const keywordsArray = sanitizeStringArray(
      keywords.split(",").map((k) => k.trim()).filter(Boolean)
    );

    const { error } = await supabase
      .from("clients")
      .update({
        name: cleanName,
        domain: cleanDomain,
        industry: cleanIndustry,
        target_keywords: keywordsArray.length > 0 ? keywordsArray : null,
      })
      .eq("id", id);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(`/dashboard/clients/${id}`);
      router.refresh();
    }
  }

  if (!client) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Edit Client</h1>

      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
          <CardDescription>Update client information.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Domain *</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Target Keywords</Label>
              <Textarea
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of target keywords
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
