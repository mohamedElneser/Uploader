"use client";

interface StepHeaderProps {
  index: number;
  title: string;
  description?: string;
  done?: boolean;
  active?: boolean;
  children?: React.ReactNode;
}

export function StepHeader({ index, title, description, done, active, children }: StepHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={[
          "no-select mt-[2px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold",
          done
            ? "border-success bg-success-subtle text-success"
            : active
            ? "border-accent bg-accent-subtle text-accent"
            : "border-ink-200 bg-white text-ink-500",
        ].join(" ")}
        aria-hidden="true"
      >
        {done ? "✓" : index}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[15.5px] font-bold tracking-tight text-ink-900">{title}</h2>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{description}</p>
        )}
        {children}
      </div>
    </div>
  );
}
