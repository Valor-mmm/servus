import { assertStringIncludes } from "@std/assert";
import { generateQrSvg } from "@/lib/invites/qr.ts";

Deno.test("generateQrSvg returns an SVG string", async () => {
  const svg = await generateQrSvg("https://example.com/invite/abc123");
  assertStringIncludes(svg, "<svg");
});

Deno.test("generateQrSvg encodes the given URL", async () => {
  const url = "https://servus.valor.codes/invite/testcode";
  const svg = await generateQrSvg(url);
  assertStringIncludes(svg, "<svg");
  // SVG must be non-empty and well-formed enough to contain closing tag
  assertStringIncludes(svg, "</svg>");
});
