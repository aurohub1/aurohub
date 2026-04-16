"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  src: string;
  shape: "circle" | "square";
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
}

export default function ImageCropModal({ src, shape, onClose, onConfirm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const SIZE = 280;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const fit = Math.max(SIZE / img.width, SIZE / img.height);
      setScale(fit);
      setOffset({ x: (SIZE - img.width * fit) / 2, y: (SIZE - img.height * fit) / 2 });
      setLoaded(true);
    };
    img.src = src;
  }, [src]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Draw image
    ctx.save();
    ctx.drawImage(img, offset.x, offset.y, img.width * scale, img.height * scale);
    ctx.restore();

    // Draw overlay with cutout
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalCompositeOperation = "destination-out";
    const margin = 16;
    const cropSize = SIZE - margin * 2;
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, cropSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(margin, margin, cropSize, cropSize);
    }
    ctx.restore();

    // Draw border
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.5;
    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, cropSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(margin, margin, cropSize, cropSize);
    }
    ctx.restore();
  }, [offset, scale, shape]);

  useEffect(() => { if (loaded) draw(); }, [loaded, draw]);

  function onMouseDown(e: React.MouseEvent) {
    dragging.current = true;
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }
  function onMouseUp() { dragging.current = false; }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setScale(s => Math.max(0.1, Math.min(5, s + (e.deltaY > 0 ? -0.05 : 0.05))));
  }

  function zoom(dir: number) {
    setScale(s => Math.max(0.1, Math.min(5, s + dir * 0.1)));
  }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img) return;
    const margin = 16;
    const cropSize = SIZE - margin * 2;
    const outCanvas = document.createElement("canvas");
    const outSize = 512;
    outCanvas.width = outSize;
    outCanvas.height = outSize;
    const ctx = outCanvas.getContext("2d")!;

    if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    const sx = (margin - offset.x) / scale;
    const sy = (margin - offset.y) / scale;
    const sw = cropSize / scale;
    const sh = cropSize / scale;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outSize, outSize);

    outCanvas.toBlob(blob => {
      if (blob) onConfirm(blob);
    }, "image/png");
  }

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-[var(--bdr)] bg-[var(--bg1)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
          <h3 className="text-[14px] font-bold text-[var(--txt)]">
            {shape === "circle" ? "Ajustar foto" : "Ajustar logo"}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--txt3)] hover:bg-[var(--hover-bg)]">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 p-5">
          {!loaded ? (
            <div className="flex h-[280px] w-[280px] items-center justify-center text-[12px] text-[var(--txt3)]">Carregando...</div>
          ) : (
            <canvas
              ref={canvasRef}
              width={SIZE}
              height={SIZE}
              className="cursor-grab rounded-lg active:cursor-grabbing"
              style={{ background: "#111" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onWheel={onWheel}
            />
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => zoom(-1)} className="rounded-lg border border-[var(--bdr)] p-1.5 text-[var(--txt3)] hover:bg-[var(--hover-bg)]"><ZoomOut size={16} /></button>
            <span className="text-[11px] tabular-nums text-[var(--txt3)]">{Math.round(scale * 100)}%</span>
            <button onClick={() => zoom(1)} className="rounded-lg border border-[var(--bdr)] p-1.5 text-[var(--txt3)] hover:bg-[var(--hover-bg)]"><ZoomIn size={16} /></button>
          </div>

          <p className="text-[10px] text-[var(--txt3)]">Arraste para posicionar · Scroll para zoom</p>
        </div>

        <div className="flex gap-2 border-t border-[var(--bdr)] p-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-[var(--bdr)] py-2 text-[12px] font-medium text-[var(--txt2)] hover:bg-[var(--hover-bg)]">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="flex-1 rounded-lg py-2 text-[12px] font-semibold text-white" style={{ background: "var(--brand-gradient)" }}>
            {shape === "circle" ? "Aplicar foto" : "Aplicar logo"}
          </button>
        </div>
      </div>
    </div>
  );
}
