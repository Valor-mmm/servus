import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { findBox } from "@/lib/inventory/boxRepo.ts";
import { findRoom } from "@/lib/inventory/roomRepo.ts";
import { listItemsByBox } from "@/lib/inventory/itemRepo.ts";
// @deno-types="npm:@types/qrcode@1.5.5"
import QRCode from "qrcode";

export function getRoomIcon(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("küche") || n.includes("kueche") || n.includes("kitchen")) {
    return "🍳";
  }
  if (
    n.includes("bad") || n.includes("dusche") || n.includes("wc") ||
    n.includes("toilet")
  ) {
    return "🚿";
  }
  if (
    n.includes("schlaf") || n.includes("bett") || n.includes("bedroom") ||
    n.includes("kinderzimmer") || n.includes("kinder")
  ) {
    return "🛏️";
  }
  if (n.includes("wohn") || n.includes("living") || n.includes("salon")) {
    return "🛋️";
  }
  if (
    n.includes("büro") || n.includes("buero") || n.includes("arbeit") ||
    n.includes("office")
  ) {
    return "🖥️";
  }
  if (
    n.includes("keller") || n.includes("lager") || n.includes("storage") ||
    n.includes("garage")
  ) {
    return "📦";
  }
  if (n.includes("ess") || n.includes("dining")) {
    return "🍽️";
  }
  if (
    n.includes("flur") || n.includes("diele") || n.includes("eingang") ||
    n.includes("hall")
  ) {
    return "🚪";
  }
  return "🏠";
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background: white;
  }
  .label-card {
    border: 2px solid #000;
    padding: 1.5rem 1rem;
    max-width: 320px;
    width: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .room-icon { font-size: 3rem; line-height: 1; }
  .room-name { font-size: 3rem; font-weight: bold; line-height: 1.1; word-break: break-word; }
  .code { font-size: 1.8rem; font-weight: bold; letter-spacing: 0.12em; color: #222; }
  .box-label { font-size: 1.1rem; color: #333; }
  .item-count {
    display: inline-block;
    background: #111;
    color: #fff;
    font-size: 0.95rem;
    font-weight: bold;
    padding: 0.2em 0.7em;
    border-radius: 999px;
  }
  .qr-code { margin-top: 0.5rem; }
  .qr-code svg { width: 180px; height: 180px; }
  @media print {
    body { min-height: auto; padding: 0; }
    .label-card { border: 1px solid #000; }
  }
`;

export const handler = define.handlers({
  async GET(ctx) {
    const box = await findBox(ctx.params.id);
    if (!box) return new Response(t("error.not_found"), { status: 404 });

    const [destinationRoom, items] = await Promise.all([
      box.destinationRoomId
        ? findRoom(box.destinationRoomId)
        : Promise.resolve(null),
      listItemsByBox(box.id),
    ]);

    const itemCount = items.length;
    const origin = ctx.url.origin;
    const boxUrl = `${origin}/boxes/${box.id}`;
    const qrSvg = await QRCode.toString(boxUrl, { type: "svg", margin: 1 });

    const roomIcon = destinationRoom ? getRoomIcon(destinationRoom.name) : "🏠";
    const itemCountStr = t("boxes.label_item_count", {
      count: String(itemCount),
    });

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(t("boxes.label_page_title"))} ${esc(box.code)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="label-card">
    ${destinationRoom ? `<div class="room-icon">${roomIcon}</div>` : ""}
    ${
      destinationRoom
        ? `<div class="room-name">${esc(destinationRoom.name)}</div>`
        : ""
    }
    <div class="code">${esc(box.code)}</div>
    ${box.label ? `<div class="box-label">${esc(box.label)}</div>` : ""}
    <div><span class="item-count">${esc(itemCountStr)}</span></div>
    <div class="qr-code">${qrSvg}</div>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});
