import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: "bg-[#A35233] text-white shadow-[0_0_20px_-5px_rgba(163,82,51,0.5)] hover:shadow-[0_0_30px_-5px_rgba(163,82,51,0.6)] hover:brightness-110",
        destructive:
          "bg-gradient-to-r from-destructive to-[hsl(0_62%_40%)] text-destructive-foreground shadow-md hover:shadow-lg hover:brightness-110",
        outline:
          "border border-primary/40 bg-transparent text-foreground hover:bg-primary/15 hover:text-primary hover:border-primary/60 hover:shadow-[0_0_20px_-5px_hsl(45_85%_58%/0.25)]",
        secondary:
          "bg-gradient-to-r from-secondary to-[hsl(140_25%_10%)] text-secondary-foreground border border-primary/25 hover:border-primary/40 hover:shadow-[0_0_15px_-5px_hsl(45_85%_58%/0.2)]",
        ghost: "hover:bg-primary/15 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
