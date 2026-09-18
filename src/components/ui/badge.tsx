import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/80",
        outline: "text-foreground border-border",
        muted: "border-border/50 bg-muted/60 text-muted-foreground",
        claim: "border-discora-claim/30 bg-discora-claim/10 text-discora-claim",
        evidence: "border-discora-evidence/30 bg-discora-evidence/10 text-discora-evidence",
        question: "border-discora-question/30 bg-discora-question/10 text-discora-question",
        source: "border-discora-source/30 bg-discora-source/10 text-discora-source",
        debate: "border-discora-debate/30 bg-discora-debate/10 text-discora-debate",
        moderation: "border-discora-moderation/30 bg-discora-moderation/10 text-discora-moderation",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
