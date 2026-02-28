"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, loadingText, children, disabled, ...props }, ref) => {
    return (
      <Button ref={ref} disabled={disabled || loading} {...props}>
        {loading && <Spinner />}
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  }
);
LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
