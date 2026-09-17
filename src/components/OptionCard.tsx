import type { ReactNode } from "react";

export function OptionCard({
  selected,
  onClick,
  children,
  testId,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={selected}
      onClick={onClick}
      className={`option-card ${selected ? "option-card--selected" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h3 className="section-label">{children}</h3>;
}
