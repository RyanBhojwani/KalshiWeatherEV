interface EVBadgeProps {
  edge: number;
  side: string;
}

export function EVBadge({ edge, side }: EVBadgeProps) {
  const percent = (edge * 100).toFixed(1);

  if (edge > 0.05) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        +{percent}% {side}
      </span>
    );
  }

  if (edge > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
        +{percent}% {side}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      {percent}%
    </span>
  );
}
