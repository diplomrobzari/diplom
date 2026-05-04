const statusMap: Record<string, { label: string; color: string }> = {
  pending_review: {
    label: "На рассмотрении",
    color: "bg-gray-100 text-gray-700 border-gray-300",
  },
  needs_revision: {
    label: "На доработке",
    color: "bg-amber-100 text-amber-800 border-amber-300",
  },
  recruiting: {
    label: "Набор участников",
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
  },
  upcoming: {
    label: "Скоро состоится",
    color: "bg-blue-100 text-blue-700 border-blue-300",
  },
  live: {
    label: "В процессе",
    color: "bg-orange-100 text-orange-700 border-orange-300",
  },
  finished: {
    label: "Завершено",
    color: "bg-zinc-200 text-zinc-800 border-zinc-300",
  },
  closed: {
    label: "Набор завершен",
    color: "bg-slate-200 text-slate-800 border-slate-300",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const item = statusMap[status] || {
    label: status,
    color: "bg-gray-100 text-gray-700 border-gray-300",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${item.color}`}>
      {item.label}
    </span>
  );
}
