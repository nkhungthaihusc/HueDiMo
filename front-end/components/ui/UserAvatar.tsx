"use client";

import Image from "next/image";
import { useState } from "react";
import type { User } from "@/lib/types";

export default function UserAvatar({ user, className = "h-11 w-11" }: {
  user: Pick<User, "name" | "avatarUrl" | "avatar_url">;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = user.avatarUrl || user.avatar_url;

  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 font-bold text-brand-700 ${className}`}>
      {url && url !== failedUrl ? (
        <Image src={url} alt="" width={44} height={44} unoptimized className="h-full w-full object-cover" onError={() => setFailedUrl(url)} />
      ) : user.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
