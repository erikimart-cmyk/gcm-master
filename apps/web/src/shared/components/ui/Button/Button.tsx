import { forwardRef } from "react";

import { cn } from "@/shared/lib";
import type { ButtonProps } from "./button.types";
import { buttonVariants } from "./button.variants";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";