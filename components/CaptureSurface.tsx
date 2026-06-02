import ContinuousCapture from "@/islands/ContinuousCapture.tsx";

interface Props {
  boxId?: string | null;
  csrfToken: string;
}

/**
 * Entry point for photo capture.
 * Always renders ContinuousCapture (an island), which performs client-side
 * feature detection and falls back to the file-input path when getUserMedia
 * is unavailable or permission is denied.
 */
export default function CaptureSurface({ boxId, csrfToken }: Props) {
  return <ContinuousCapture boxId={boxId} csrfToken={csrfToken} />;
}
