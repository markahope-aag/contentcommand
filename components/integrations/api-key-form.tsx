"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApiKeyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: string;
  fields: { key: string; label: string; type?: string }[];
  onSave: (values: Record<string, string>) => void;
}

export function ApiKeyForm({
  open,
  onOpenChange,
  provider,
  fields,
  onSave,
}: ApiKeyFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(values);
    onOpenChange(false);
    setValues({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {provider}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type={field.type || "text"}
                value={values[field.key] || ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                required
              />
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            API keys are stored as environment variables on the server. Contact
            your administrator to update them.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
