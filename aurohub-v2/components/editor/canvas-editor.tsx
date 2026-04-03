"use client";

// Konva editor placeholder — será expandido
export function CanvasEditor() {
  return (
    <div
      className="w-full h-[600px] rounded-xl flex items-center justify-center"
      style={{
        background: "repeating-conic-gradient(var(--color-bg-hover) 0% 25%, var(--color-bg-primary) 0% 50%) 0 0 / 16px 16px",
      }}
    >
      <p className="text-[var(--color-text-muted)]">Editor Konva — em desenvolvimento</p>
    </div>
  );
}
