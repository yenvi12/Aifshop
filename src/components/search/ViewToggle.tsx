"use client";

import { MdViewModule, MdViewList } from "react-icons/md";

interface ViewToggleProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  className?: string;
}

export default function ViewToggle({ view, onViewChange, className = "" }: ViewToggleProps) {
  return (
    <div className={`flex items-center bg-brand-light rounded-lg p-1 ${className}`}>
      <button
        onClick={() => onViewChange("grid")}
        className={`p-2 rounded-md transition-all ${
          view === "grid"
            ? "bg-white text-brand-primary shadow-sm"
            : "text-brand-secondary hover:text-brand-primary"
        }`}
        aria-label="Grid view"
        title="Grid view"
      >
        <MdViewModule className="w-5 h-5" />
      </button>
      <button
        onClick={() => onViewChange("list")}
        className={`p-2 rounded-md transition-all ${
          view === "list"
            ? "bg-white text-brand-primary shadow-sm"
            : "text-brand-secondary hover:text-brand-primary"
        }`}
        aria-label="List view"
        title="List view"
      >
        <MdViewList className="w-5 h-5" />
      </button>
    </div>
  );
}