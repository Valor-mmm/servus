import { assertEquals } from "@std/assert";
import {
  applyContinuousFocus,
  applyFocus,
  applyZoom,
  getZoomCapability,
  supportsFocusControl,
} from "@/lib/camera/controls.ts";

// ── helpers ───────────────────────────────────────────────────────────────

interface FakeCapabilities {
  zoom?: { min: number; max: number; step?: number };
  focusMode?: string[];
}

interface FakeConstraintCall {
  advanced?: Record<string, unknown>[];
}

function makeTrack(caps: FakeCapabilities = {}): MediaStreamTrack & {
  lastConstraints: FakeConstraintCall | null;
} {
  const t = {
    lastConstraints: null as FakeConstraintCall | null,
    getCapabilities() {
      return caps;
    },
    applyConstraints(c: FakeConstraintCall) {
      t.lastConstraints = c;
      return Promise.resolve();
    },
  } as unknown as MediaStreamTrack & {
    lastConstraints: FakeConstraintCall | null;
  };
  return t;
}

function makeTrackNoCapabilities(): MediaStreamTrack {
  return {
    lastConstraints: null,
    async applyConstraints() {},
  } as unknown as MediaStreamTrack;
}

// ── getZoomCapability ─────────────────────────────────────────────────────

Deno.test("getZoomCapability: returns null when getCapabilities is absent", () => {
  const track = makeTrackNoCapabilities();
  assertEquals(getZoomCapability(track), null);
});

Deno.test("getZoomCapability: returns null when zoom is not in capabilities", () => {
  const track = makeTrack({});
  assertEquals(getZoomCapability(track), null);
});

Deno.test("getZoomCapability: returns range when zoom capability is present", () => {
  const track = makeTrack({ zoom: { min: 1, max: 5, step: 0.5 } });
  assertEquals(getZoomCapability(track), { min: 1, max: 5, step: 0.5 });
});

Deno.test("getZoomCapability: uses default step when step is absent", () => {
  const track = makeTrack({ zoom: { min: 1, max: 3 } });
  const cap = getZoomCapability(track);
  assertEquals(cap?.min, 1);
  assertEquals(cap?.max, 3);
  assertEquals(cap?.step, 0.1);
});

// ── supportsFocusControl ──────────────────────────────────────────────────

Deno.test("supportsFocusControl: returns false when getCapabilities is absent", () => {
  const track = makeTrackNoCapabilities();
  assertEquals(supportsFocusControl(track), false);
});

Deno.test("supportsFocusControl: returns false when focusMode not in capabilities", () => {
  const track = makeTrack({});
  assertEquals(supportsFocusControl(track), false);
});

Deno.test("supportsFocusControl: returns false when manual not in focusMode list", () => {
  const track = makeTrack({ focusMode: ["continuous"] });
  assertEquals(supportsFocusControl(track), false);
});

Deno.test("supportsFocusControl: returns true when manual is in focusMode list", () => {
  const track = makeTrack({ focusMode: ["continuous", "manual"] });
  assertEquals(supportsFocusControl(track), true);
});

// ── applyZoom ─────────────────────────────────────────────────────────────

Deno.test("applyZoom: calls applyConstraints with zoom advanced constraint", async () => {
  const track = makeTrack({ zoom: { min: 1, max: 5 } });
  await applyZoom(track, 2.5);
  assertEquals(track.lastConstraints, { advanced: [{ zoom: 2.5 }] });
});

// ── applyFocus ────────────────────────────────────────────────────────────

Deno.test("applyFocus: calls applyConstraints with manual focusMode and pointOfInterest", async () => {
  const track = makeTrack({ focusMode: ["continuous", "manual"] });
  await applyFocus(track, 0.4, 0.6);
  assertEquals(track.lastConstraints, {
    advanced: [{ focusMode: "manual", pointOfInterest: { x: 0.4, y: 0.6 } }],
  });
});

// ── applyContinuousFocus ──────────────────────────────────────────────────

Deno.test("applyContinuousFocus: calls applyConstraints with continuous focusMode", async () => {
  const track = makeTrack({ focusMode: ["continuous", "manual"] });
  await applyContinuousFocus(track);
  assertEquals(track.lastConstraints, {
    advanced: [{ focusMode: "continuous" }],
  });
});
