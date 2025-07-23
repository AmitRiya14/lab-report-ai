import { useState } from "react";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PromptPopoverProps {
  open: boolean;
  anchorEl: DOMRect | null;
  previewText: string;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

/**
 * PromptPopover Component
 * 
 * Modal popover for editing selected text with AI assistance.
 * Positioned relative to the selected text and provides a prompt interface.
 * 
 * Features:
 * - Dynamic positioning based on selected text
 * - Preview of selected text
 * - Custom prompt input
 * - Smart viewport positioning
 */
export default function PromptPopover({
  open,
  anchorEl,
  previewText,
  onClose,
  onSubmit
}: PromptPopoverProps) {
  const [input, setInput] = useState("");

  if (!open || !anchorEl) return null;

  return (
    <Popover open={true}>
      <PopoverContent
        side="bottom"
        align="start"
        style={{
          position: "absolute",
          left: anchorEl.left,
          // Smart positioning: place above if not enough space below
          top: Math.max(
            window.innerHeight - anchorEl.bottom < 200
              ? anchorEl.top - 200 - 8
              : anchorEl.bottom + 8,
            8 // Minimum margin from top
          ),
          zIndex: 50,
          width: 360,
        }}
        className="rounded-xl border border-gray-200 shadow-xl bg-white p-4"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg"
        >
          ×
        </button>

        {/* Header */}
        <div className="text-sm font-semibold text-cyan-700 mb-2">
          ✏️ Edit Selected Text
        </div>

        {/* Preview of selected text */}
        <div className="bg-cyan-50 text-cyan-800 text-sm p-2 mb-3 rounded border border-cyan-100">
          "{previewText}"
        </div>

        {/* Prompt input */}
        <Textarea
          rows={3}
          placeholder="How would you like to modify this text?"
          className="text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        {/* Action buttons */}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!input.trim()}
            onClick={() => {
              onSubmit(input);
              setInput("");
            }}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}