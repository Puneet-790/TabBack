import Image from "next/image";
import type { UserProfile } from "@/lib/user-profile";

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

export function UserAvatar({
  profile,
  size = "md",
  className = "",
}: {
  profile: UserProfile;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  if (profile.avatarUrl) {
    return (
      <Image
        src={profile.avatarUrl}
        alt={profile.name || profile.email || "Profile picture"}
        width={112}
        height={112}
        unoptimized
        referrerPolicy="no-referrer"
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${SIZE_CLASSES[size]} grid shrink-0 place-items-center rounded-full bg-accent-soft font-semibold text-accent-deep ${className}`}
    >
      {profile.initials || "?"}
    </span>
  );
}