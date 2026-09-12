import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm
        placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring disabled:opacity-50 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";