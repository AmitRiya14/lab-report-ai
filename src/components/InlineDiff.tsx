// --- PATCHED: components/InlineDiff.tsx ---
import React, { useState } from 'react';
import { diffWords } from 'diff';

export default function InlineDiff({
  original,
  updated,
  onAccept,
  onReject
}: {
  original: string;
  updated: string;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const parts = diffWords(original || "", updated || "");

  return (
    <div
      className="relative border border-blue-100 rounded-lg p-3 bg-white shadow-sm"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <p className="text-gray-800">
        {parts.map((part, i) => {
          if (part.added) {
            return (
              <span
                key={i}
                className="bg-green-100 text-green-800 px-1 rounded-sm mx-0.5"
                title="AI suggested insertion"
              >
                {part.value}
              </span>
            );
          }
          if (part.removed) {
            return (
              <del
                key={i}
                className="bg-red-100 text-red-600 line-through px-1 rounded-sm mx-0.5"
                title="AI suggested removal"
              >
                {part.value}
              </del>
            );
          }
          return <span key={i}>{part.value}</span>;
        })}
      </p>

      {showActions && (
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            onClick={onAccept}
            className="bg-green-500 text-white text-xs px-2 py-1 rounded hover:bg-green-600"
          >
            Accept
          </button>
          <button
            onClick={onReject}
            className="bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
