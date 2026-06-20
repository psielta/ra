"use client";

import { Activity, AudioLines } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

import { cn } from "@/lib/utils";

type AudioVisualizerProps<T extends HTMLMediaElement> = {
  mediaRef: RefObject<T | null>;
  variant?: "full" | "compact";
};

type SourceRecord = {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
};

type AudioAnalysisBuffer = Uint8Array<ArrayBuffer>;

const sourceRegistry = new WeakMap<HTMLMediaElement, SourceRecord>();
let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextConstructor) return null;

  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioContextConstructor();
  }

  return sharedAudioContext;
}

function getOrCreateSource(media: HTMLMediaElement, context: AudioContext) {
  const existing = sourceRegistry.get(media);

  if (existing) {
    return existing.source;
  }

  const source = context.createMediaElementSource(media);
  sourceRegistry.set(media, { context, source });

  return source;
}

function updateStatusAsync(
  setStatus: (status: "idle" | "ready" | "unsupported") => void,
  status: "idle" | "ready" | "unsupported",
) {
  window.queueMicrotask(() => setStatus(status));
}

function paintIdle(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "rgba(148, 163, 184, 0.12)";
  context.fillRect(0, height - 12, width, 4);
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * scale));
  const height = Math.max(1, Math.floor(rect.height * scale));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return { width, height };
}

function drawVisualizerFrame(input: {
  analyser: AnalyserNode;
  canvas: HTMLCanvasElement;
  frequencyData: AudioAnalysisBuffer;
  waveformData: AudioAnalysisBuffer;
  variant: "full" | "compact";
}) {
  const { analyser, canvas, frequencyData, waveformData, variant } = input;
  const context = canvas.getContext("2d");
  if (!context) return;

  const { width, height } = resizeCanvas(canvas);
  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(waveformData);

  context.clearRect(0, 0, width, height);

  const spectrumHeight = variant === "compact" ? height * 0.72 : height * 0.56;
  const vuWidth = variant === "compact" ? 10 : 16;
  const barAreaWidth = width - vuWidth - 12;
  const barCount = Math.min(64, frequencyData.length);
  const gap = Math.max(1, width * 0.002);
  const barWidth = Math.max(
    2,
    (barAreaWidth - gap * (barCount - 1)) / barCount,
  );

  for (let index = 0; index < barCount; index += 1) {
    const value = frequencyData[index] / 255;
    const barHeight = Math.max(2, value * spectrumHeight);
    const x = index * (barWidth + gap);
    const y = spectrumHeight - barHeight;

    const hue = 44 + value * 90;
    context.fillStyle = `hsl(${hue} 82% ${48 + value * 18}%)`;
    context.fillRect(x, y, barWidth, barHeight);
  }

  let sumSquares = 0;
  let peak = 0;

  for (const sample of waveformData) {
    const normalized = (sample - 128) / 128;
    sumSquares += normalized * normalized;
    peak = Math.max(peak, Math.abs(normalized));
  }

  const rms = Math.sqrt(sumSquares / waveformData.length);
  const meterHeight = Math.max(4, height * Math.max(rms, peak * 0.7));
  const meterX = width - vuWidth;

  context.fillStyle = "rgba(148, 163, 184, 0.16)";
  context.fillRect(meterX, 0, vuWidth, height);
  context.fillStyle =
    peak > 0.88
      ? "hsl(0 76% 58%)"
      : peak > 0.66
        ? "hsl(39 92% 52%)"
        : "hsl(142 70% 45%)";
  context.fillRect(meterX, height - meterHeight, vuWidth, meterHeight);

  if (variant === "compact") return;

  const waveformTop = spectrumHeight + 22;
  const waveformHeight = height - waveformTop - 8;
  const centerY = waveformTop + waveformHeight / 2;
  const sliceWidth = barAreaWidth / waveformData.length;

  context.strokeStyle = "rgba(234, 179, 8, 0.86)";
  context.lineWidth = Math.max(1, width * 0.002);
  context.beginPath();

  for (let index = 0; index < waveformData.length; index += 1) {
    const x = index * sliceWidth;
    const y =
      centerY + ((waveformData[index] - 128) / 128) * (waveformHeight / 2);

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();

  context.strokeStyle = "rgba(148, 163, 184, 0.22)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, centerY);
  context.lineTo(barAreaWidth, centerY);
  context.stroke();
}

export function AudioVisualizer<T extends HTMLMediaElement>({
  mediaRef,
  variant = "full",
}: AudioVisualizerProps<T>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "unsupported">(
    "idle",
  );

  useEffect(() => {
    const media = mediaRef.current;
    const canvas = canvasRef.current;
    if (!media || !canvas) return;

    const audioContext = getAudioContext();
    if (!audioContext) {
      updateStatusAsync(setStatus, "unsupported");
      paintIdle(canvas);
      return;
    }

    let analyser: AnalyserNode | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    let cancelled = false;

    try {
      source = getOrCreateSource(media, audioContext);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = variant === "compact" ? 512 : 2048;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
    } catch {
      updateStatusAsync(setStatus, "unsupported");
      paintIdle(canvas);
      return;
    }

    const frequencyData: AudioAnalysisBuffer = new Uint8Array(
      new ArrayBuffer(analyser.frequencyBinCount),
    );
    const waveformData: AudioAnalysisBuffer = new Uint8Array(
      new ArrayBuffer(analyser.fftSize),
    );

    const render = () => {
      if (!analyser || cancelled) return;

      drawVisualizerFrame({
        analyser,
        canvas,
        frequencyData,
        waveformData,
        variant,
      });

      animationRef.current = window.requestAnimationFrame(render);
    };

    const resume = () => {
      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }

      updateStatusAsync(setStatus, "ready");
    };

    const handleResize = () => paintIdle(canvas);

    media.addEventListener("play", resume);
    media.addEventListener("playing", resume);
    window.addEventListener("resize", handleResize);
    paintIdle(canvas);
    render();

    return () => {
      cancelled = true;

      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      media.removeEventListener("play", resume);
      media.removeEventListener("playing", resume);
      window.removeEventListener("resize", handleResize);

      try {
        source?.disconnect(analyser);
      } catch {
        // The source can already be disconnected during hot reload/strict mode.
      }

      try {
        analyser?.disconnect();
      } catch {
        // No-op.
      }
    };
  }, [mediaRef, variant]);

  return (
    <div
      className={cn(
        "border-gold/10 bg-muted/20 overflow-hidden rounded-md border",
        variant === "compact" ? "p-2" : "space-y-3 p-3",
      )}
    >
      {variant === "full" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="text-muted-foreground flex items-center gap-2">
            <AudioLines className="text-gold size-4" />
            <span className="text-foreground font-medium">
              Visualizador de audio
            </span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Activity className="size-3.5" />
            <span>
              {status === "unsupported"
                ? "Web Audio indisponivel"
                : status === "ready"
                  ? "Spectrum / VU / waveform"
                  : "Aguardando play"}
            </span>
          </div>
        </div>
      ) : null}

      <canvas
        ref={canvasRef}
        className={cn(
          "block w-full rounded bg-black/80",
          variant === "compact" ? "h-14" : "h-44",
        )}
        aria-label="Visualizador de audio"
      />
    </div>
  );
}
