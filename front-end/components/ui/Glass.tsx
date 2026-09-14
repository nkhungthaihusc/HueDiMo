import type { HTMLAttributes } from "react";

type GlassProps = HTMLAttributes<HTMLDivElement> & {
  strong?: boolean;
};

export default function Glass({ strong, className = "", ...props }: GlassProps) {
  return (
    <div className={`${strong ? "glass-strong" : "glass"} rounded-2xl ${className}`} {...props} />
  );
}
