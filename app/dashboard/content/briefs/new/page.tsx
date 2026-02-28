"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type { Client } from "@/types/database";

export default function NewBriefPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI generation fields
  const [selectedClient, setSelectedClient] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [contentType, setContentType] = useState("blog_post");

  // Manual fields
  const [manualTitle, setManualTitle] = useState("");
  const [manualKeyword, setManualKeyword] = useState("");
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
    } catch {
      // Silently handle — clients dropdown may be empty
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
      const res = await fetch("/api/content/briefs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient,
          targetKeyword,
          contentType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      router.push(`/dashboard/content/briefs/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
      router.push(`/dashboard/content/briefs/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold">New Content Brief</h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
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
                Enter a target keyword and we&apos;ll analyze competitive data
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
              <Button
                onClick={handleAiGenerate}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Generating Brief..." : "Generate Brief with AI"}
              </Button>
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
              <Button
                onClick={handleManualCreate}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Brief"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
