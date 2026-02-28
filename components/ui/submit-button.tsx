"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface SubmitButtonProps extends ButtonProps {
  loadingText?: string;
}

export function SubmitButton({
  loadingText,
  children,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending && <Spinner />}
      {pending && loadingText ? loadingText : children}
    </Button>
  );
}
