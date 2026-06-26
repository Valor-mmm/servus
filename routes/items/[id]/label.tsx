import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { findItem } from "@/lib/inventory/itemRepo.ts";
import { findCategory } from "@/lib/inventory/categoryRepo.ts";
// @deno-types="npm:@types/qrcode@1.5.5"
import QRCode from "qrcode";

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
  .item-name { font-size: 2rem; font-weight: bold; line-height: 1.2; word-break: break-word; }
  .qr-code { margin-top: 0.5rem; }
  .qr-code svg { width: 180px; height: 180px; }
  @media screen {
    .toolbar {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
      align-items: center;
    }
    .toolbar-btn {
      padding: 0.5rem 1.25rem;
      font-size: 1rem;
      cursor: pointer;
      border: 2px solid #111;
      background: #111;
      color: #fff;
      border-radius: 4px;
    }
    .toolbar-link {
      font-size: 1rem;
      color: #333;
      text-decoration: underline;
    }
  }
  @media print {
    body { min-height: auto; padding: 0; }
    .label-card { border: 1px solid #000; }
    .toolbar { display: none; }
  }
`;

export const handler = define.handlers({
  async GET(ctx) {
    const item = await findItem(ctx.params.id);
    if (!item) return new Response(t("error.not_found"), { status: 404 });

    // Only container-capable items may have a label page
    const category = item.categoryId
      ? await findCategory(item.categoryId)
      : null;
    if (!category?.canContain) {
      return new Response(t("error.not_found"), { status: 404 });
    }

    const origin = ctx.url.origin;
    const itemUrl = `${origin}/items/${item.id}`;
    const qrSvg = await QRCode.toString(itemUrl, { type: "svg", margin: 1 });

    const name = item.name || t("items.placeholderName");

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(t("items.label_page_title"))} – ${esc(name)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="toolbar">
    <button id="print-btn" class="toolbar-btn">${
      esc(t("boxes.action.print"))
    }</button>
    <a class="toolbar-link" href="/items/${esc(item.id)}">${
      esc(t("action.back"))
    }</a>
  </div>
  <div class="label-card">
    <div class="item-name">${esc(name)}</div>
    <div class="qr-code">${qrSvg}</div>
  </div>
  <script>
    document.getElementById('print-btn').addEventListener('click', function() {
      window.print();
    });
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});
