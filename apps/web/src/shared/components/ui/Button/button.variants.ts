import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "inline-flex",
    "items-center",
    "justify-center",
    "rounded-xl",
    "font-medium",
    "transition-all",
    "duration-200",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-blue-500",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-blue-600 text-white hover:bg-blue-700",

        secondary:
          "bg-zinc-800 text-white hover:bg-zinc-700",

        outline:
          "border border-zinc-700 bg-transparent text-white hover:bg-zinc-900",

        ghost:
          "text-white hover:bg-zinc-900",
      },

      size: {
        sm: "h-9 px-3 text-sm",

        md: "h-10 px-4",

        lg: "h-12 px-6 text-lg",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);