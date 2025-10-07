import React from "react";

interface SectionProps {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}

export default function Section({ title, right, children }: SectionProps) {
  return (
    <div className="rounded-2xl border border-brand-light bg-white p-5 shadow-smooth">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-brand-dark">{title}</h2>
        {right && <div>{right}</div>}
      </div>

      {/* Content */}
      <div className="space-y-3">{children}</div>
    </div>
  );
}
