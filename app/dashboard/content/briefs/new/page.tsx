"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@/types/database";

export default function NewBriefPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read URL params
  const urlKeyword = searchParams.get("keyword") || "";
  const urlType = searchParams.get("type") as "optimization" | "refresh" | "consolidation" | "new" | "thin" | "opportunity" | "decaying" | null;
  const urlClientId = searchParams.get("clientId") || "";
  const urlPage = searchParams.get("page") || "";

  // AI generation fields
  const [selectedClient, setSelectedClient] = useState(urlClientId);
  const [targetKeyword, setTargetKeyword] = useState(urlKeyword);
  const [contentType, setContentType] = useState("blog_post");
  const [contentPurpose, setContentPurpose] = useState(urlType || "");

  // Manual fields
  const [manualTitle, setManualTitle] = useState("");
  const [manualKeyword, setManualKeyword] = useState(urlKeyword);
  const [manualAudience, setManualAudience] = useState("");
  const [manualAngle, setManualAngle] = useState("");
  const [manualWordCount, setManualWordCount] = useState("1500");

  useEffect(() => {
    fetchClientsDirectly();
  }, []);

  async function fetchClientsDirectly() {
    try {
      // Use Supabase client-side
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      setClients(data || []);
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  }

  const handleAiGenerate = async () => {
    if (!selectedClient || !targetKeyword) {
      setError("Please select a client and enter a target keyword");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string | undefined> = {
        clientId: selectedClient,
        targetKeyword,
        contentType,
      };
      const effectiveType = urlType || contentPurpose;
      if (effectiveType) body.briefType = effectiveType;
      if (urlPage) body.pagePath = urlPage;

      const res = await fetch("/api/content/briefs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      toast({ title: "Brief generated", description: "Your AI-powered brief is ready." });
      router.push(`/dashboard/content/briefs/${data.data.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast({ title: "Generation failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleManualCreate = async () => {
    if (!selectedClient || !manualTitle || !manualKeyword) {
      setError("Please fill in required fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("content_briefs")
        .insert({
          client_id: selectedClient,
          title: manualTitle,
          target_keyword: manualKeyword,
          content_type: contentType,
          target_audience: manualAudience || null,
          unique_angle: manualAngle || null,
          target_word_count: parseInt(manualWordCount) || 1500,
          status: "draft",
          priority_level: "medium",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      toast({ title: "Brief created", description: "Your content brief has been saved." });
      router.push(`/dashboard/content/briefs/${data.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      toast({ title: "Creation failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const briefTypeLabel: Record<string, string> = {
    optimization: "Optimization",
    refresh: "Content Refresh",
    consolidation: "Consolidation",
    new: "New Content",
    decaying: "Restore Decaying Content",
    thin: "Expand Thin Content",
    opportunity: "Capture Opportunity",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">New Content Brief</h1>

      {urlType && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 text-sm">
          <span className="font-medium">Brief type:</span> {briefTypeLabel[urlType] || urlType}
          {urlPage && (
            <>
              {" "}&middot;{" "}
              <span className="font-medium">Page:</span>{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{urlPage}</code>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Content Type</Label>
          <Select value={contentType} onValueChange={setContentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blog_post">Blog Post</SelectItem>
              <SelectItem value="landing_page">Landing Page</SelectItem>
              <SelectItem value="pillar_page">Pillar Page</SelectItem>
              <SelectItem value="how_to_guide">How-To Guide</SelectItem>
              <SelectItem value="case_study">Case Study</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!urlType && (
          <div className="space-y-2">
            <Label>Content Purpose</Label>
            <Select value={contentPurpose} onValueChange={setContentPurpose}>
              <SelectTrigger>
                <SelectValue placeholder="What is the goal of this content?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Capture a new keyword</SelectItem>
                <SelectItem value="optimization">Outrank a competitor</SelectItem>
                <SelectItem value="authority">Build domain authority for a content cluster</SelectItem>
                <SelectItem value="decaying">Restore decaying content</SelectItem>
                <SelectItem value="thin">Expand thin content</SelectItem>
                <SelectItem value="opportunity">Improve CTR on high-impression page</SelectItem>
                <SelectItem value="consolidation">Consolidate cannibalized pages</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Helps the AI tailor the brief to your specific goal.
            </p>
          </div>
        )}
      </div>

      <Tabs defaultValue="ai">
        <TabsList>
          <TabsTrigger value="ai">AI Generate</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                AI-Powered Brief Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter a target keyword and we&apos;ll analyze competitive data,
                existing content performance, keyword gaps, PPC intelligence,
                and AI citation opportunities to generate a comprehensive brief.
              </p>
              <div className="space-y-2">
                <Label htmlFor="keyword">Target Keyword</Label>
                <Input
                  id="keyword"
                  placeholder="e.g., best project management software"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                />
              </div>
              <LoadingButton
                onClick={handleAiGenerate}
                loading={loading}
                loadingText="Generating Brief..."
                className="w-full"
              >
                Generate Brief with AI
              </LoadingButton>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manual Brief Creation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Brief title"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-keyword">Target Keyword</Label>
                <Input
                  id="manual-keyword"
                  placeholder="Primary keyword"
                  value={manualKeyword}
                  onChange={(e) => setManualKeyword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Input
                  id="audience"
                  placeholder="Who is this content for?"
                  value={manualAudience}
                  onChange={(e) => setManualAudience(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="angle">Unique Angle</Label>
                <Textarea
                  id="angle"
                  placeholder="What makes this content different?"
                  value={manualAngle}
                  onChange={(e) => setManualAngle(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wordcount">Target Word Count</Label>
                <Input
                  id="wordcount"
                  type="number"
                  value={manualWordCount}
                  onChange={(e) => setManualWordCount(e.target.value)}
                />
              </div>
              <LoadingButton
                onClick={handleManualCreate}
                loading={loading}
                loadingText="Creating..."
                className="w-full"
              >
                Create Brief
              </LoadingButton>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
