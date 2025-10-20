"use client";

import { MdSmartToy } from "react-icons/md";

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
        <MdSmartToy className="w-4 h-4 text-white" />
      </div>
      
      {/* Typing bubble */}
      <div className="bg-brand-light/60 rounded-2xl rounded-tl-none px-4 py-3 max-w-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-brand-secondary rounded-full typing-dot-1" />
          <div className="w-2 h-2 bg-brand-secondary rounded-full typing-dot-2" />
          <div className="w-2 h-2 bg-brand-secondary rounded-full typing-dot-3" />
        </div>
      </div>
    </div>
  );
}