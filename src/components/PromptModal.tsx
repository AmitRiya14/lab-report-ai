// --- PATCH 4: components/PromptModal.tsx ---
import { useState } from "react";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function PromptPopover({
  open,
  anchorEl,
  previewText,
  onClose,
  onSubmit
}: {
  open: boolean;
  anchorEl: DOMRect | null;
  previewText: string;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}) {
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
          top: anchorEl.bottom + 8,
          zIndex: 50,
          width: 360,
        }}
        className="rounded-xl border border-gray-200 shadow-xl bg-white p-4"
      >
        <div className="text-sm font-semibold text-cyan-700 mb-2">✏️ Edit Selected Text</div>
        <div className="bg-cyan-50 text-cyan-800 text-sm p-2 mb-3 rounded border border-cyan-100">
          “{previewText}”
        </div>
        <Textarea
          rows={3}
          placeholder="How would you like to modify this text?"
          className="text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
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