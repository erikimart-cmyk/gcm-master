type GoalCardProps = {
  icon: string;
  title: string;
  description: string;
  selected?: boolean;
  onClick?: () => void;
};

export function GoalCard({
  icon,
  title,
  description,
  selected = false,
  onClick,
}: GoalCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group
        rounded-2xl
        border
        p-6
        text-left
        transition-all
        duration-300
        ${
          selected
            ? "border-blue-500 bg-blue-500/10"
            : "border-zinc-800 bg-zinc-900 hover:border-blue-500 hover:-translate-y-1"
        }
      `}
    >
      <div className="text-4xl">{icon}</div>

      <h3 className="mt-4 text-xl font-bold">{title}</h3>

      <p className="mt-2 text-sm text-zinc-400">
        {description}
      </p>
    </button>
  );
}