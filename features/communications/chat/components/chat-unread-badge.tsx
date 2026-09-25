export function ChatUnreadBadge({
  count,
  archived,
}: Readonly<{
  count: number;
  archived: boolean;
}>) {
  if (archived || count <= 0) return null;

  const label = `${count} unread ${count === 1 ? "message" : "messages"}`;

  return (
    <span
      aria-label={label}
      className="inline-flex min-w-6 items-center justify-center rounded-full bg-sky-700 px-2 py-0.5 text-xs font-bold text-white"
      title={label}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
