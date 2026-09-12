import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { motion } from "framer-motion";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

type Size = "sm" | "md" | "lg";

interface ButtonProps
  extends Omit<
    ComponentPropsWithoutRef<typeof motion.button>,
    "children" | "className"
  > {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
  outline: "border border-border bg-transparent hover:bg-muted",
  ghost: "hover:bg-muted",
  destructive:
    "bg-destructive text-destructive-foreground hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => (
    <motion.button
      whileTap={{ scale: 0.97 }}
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? "Please wait…" : children}
    </motion.button>
  )
);

Button.displayName = "Button";
