import type { VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { buttonVariants } from "./button.variants";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}