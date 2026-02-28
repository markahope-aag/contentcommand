"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sanitizeString, sanitizeDomain, sanitizeStringArray } from "@/lib/sanitize";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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

export default function NewClientPage() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const cleanName = sanitizeString(name);
    const cleanDomain = sanitizeDomain(domain);

    if (!cleanName || !cleanDomain) {
      toast({ title: "Validation error", description: "Name and domain are required.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const cleanIndustry = sanitizeString(industry) || null;
    const keywordsArray = sanitizeStringArray(
      keywords.split(",").map((k) => k.trim()).filter(Boolean)
    );

    const supabase = createClient();

    // Get current org from localStorage
    const orgId = typeof window !== "undefined"
      ? localStorage.getItem("currentOrgId")
      : null;

    const { error } = await supabase.rpc("create_client_with_owner", {
      client_name: cleanName,
      client_domain: cleanDomain,
      client_industry: cleanIndustry,
      client_target_keywords: keywordsArray.length > 0 ? keywordsArray : null,
      client_brand_voice: null,
      p_org_id: orgId,
    });

    if (error) {
      toast({ title: "Failed to create client", description: error.message, variant: "destructive" });
      setLoading(false);
    } else {
      toast({ title: "Client created", description: `${cleanName} has been added.` });
      router.push("/dashboard/clients");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">Add New Client</h1>

      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
          <CardDescription>
            Add a new client to start tracking their content strategy.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
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
                placeholder="acme.com"
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
                placeholder="Technology, Healthcare, etc."
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Target Keywords</Label>
              <Textarea
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="keyword1, keyword2, keyword3"
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of target keywords
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <LoadingButton type="submit" loading={loading} loadingText="Creating...">
                Create Client
              </LoadingButton>
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
