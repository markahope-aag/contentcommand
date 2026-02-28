"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sanitizeString, sanitizeDomain } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CompetitorActions({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [strength, setStrength] = useState("5");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const cleanName = sanitizeString(name);
    const cleanDomain = sanitizeDomain(domain);
    const strengthNum = Math.min(10, Math.max(1, parseInt(strength) || 5));

    const supabase = createClient();
    const { error } = await supabase.from("competitors").insert({
      client_id: clientId,
      name: cleanName,
      domain: cleanDomain,
      competitive_strength: strengthNum,
    });

    if (!error) {
      setOpen(false);
      setName("");
      setDomain("");
      setStrength("5");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Competitor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Competitor</DialogTitle>
          <DialogDescription>
            Track a new competitor for this client.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comp-name">Name</Label>
            <Input
              id="comp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Competitor name"
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comp-domain">Domain</Label>
            <Input
              id="comp-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="competitor.com"
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comp-strength">Competitive Strength (1-10)</Label>
            <Input
              id="comp-strength"
              type="number"
              min="1"
              max="10"
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Competitor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
