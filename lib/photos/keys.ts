export function generatePhotoKey(): string {
  const bytes = new Uint8Array(32); // 256 bits — well above the 128-bit minimum
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
