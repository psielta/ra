import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";

import { AudioVisualizer } from "@/components/media/audio-visualizer";

function AudioVisualizerHarness() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
    <div>
      <audio ref={audioRef} />
      <AudioVisualizer mediaRef={audioRef} />
    </div>
  );
}

describe("AudioVisualizer", () => {
  it("renders a fallback state when Web Audio API is unavailable", async () => {
    render(<AudioVisualizerHarness />);

    expect(screen.getByText("Visualizador de audio")).toBeInTheDocument();
    expect(
      await screen.findByText("Web Audio indisponivel"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Visualizador de audio")).toBeInTheDocument();
  });
});
