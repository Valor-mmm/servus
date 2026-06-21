import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { EmptyState } from "@/components/EmptyState.tsx";
import {
  findItem,
  listItems,
  resolveRoom,
  updateItem,
} from "@/lib/inventory/itemRepo.ts";
import { findCategory, listCategories } from "@/lib/inventory/categoryRepo.ts";
import { resolveSchema } from "@/lib/inventory/schemaRepo.ts";
import { MetadataValidationError } from "@/lib/inventory/validateMetadata.ts";
import { listRooms } from "@/lib/inventory/roomRepo.ts";
import { listBoxes } from "@/lib/inventory/boxRepo.ts";
import type { BoxWithItemCount } from "@/lib/inventory/boxRepo.ts";
import type {
  Category,
  CategorySchema,
  Item,
  Room,
} from "@/lib/inventory/types.ts";
import {
  readMetadataFromForm,
  SchemaFields,
} from "@/components/SchemaFields.tsx";
import ItemLocationFields from "@/islands/ItemLocationFields.tsx";
import { getR2Config } from "@/lib/photos/config.ts";
import { presignGet } from "@/lib/photos/signing.ts";

interface PageProps {
  items: Item[];
  idx: number;
  item: Item;
  categories: Category[];
  schema: CategorySchema;
  rooms: Room[];
  boxes: BoxWithItemCount[];
  error: string | null;
  csrfToken: string;
  thumbnailUrl: string | null;
  containerName: string | null;
  derivedRoomId: string | null;
}

function EmptyPage() {
  return (
    <main class="page">
      <div class="page-header">
        <h1>{t("items.incomplete_title")}</h1>
        <a href="/items" class="btn-secondary">{t("action.back")}</a>
      </div>
      <EmptyState message={t("items.incomplete_empty")} />
    </main>
  );
}

function TriagePage(
  {
    items,
    idx,
    item,
    categories,
    schema,
    rooms,
    boxes,
    error,
    csrfToken,
    thumbnailUrl,
    containerName,
    derivedRoomId,
  }: PageProps,
) {
  const total = items.length;
  const prevIdx = idx > 0 ? idx - 1 : null;
  const nextIdx = idx < total - 1 ? idx + 1 : null;
  const displayName = item.name || t("items.placeholderName");

  return (
    <main class="page">
      <div class="page-header">
        <h1>{t("items.incomplete_title")}</h1>
        <a href="/items" class="btn-secondary">{t("action.back")}</a>
      </div>

      <div class="triage-index">
        {t("items.triageIndex", { n: String(idx + 1), m: String(total) })}
      </div>

      <div class="triage-nav">
        {prevIdx !== null
          ? (
            <a
              href={`/items/incomplete?idx=${prevIdx}`}
              class="btn-secondary btn-small"
            >
              {t("items.triagePrev")}
            </a>
          )
          : (
            <span
              class="btn-secondary btn-small btn-disabled"
              aria-disabled="true"
            >
              {t("items.triagePrev")}
            </span>
          )}
        {nextIdx !== null
          ? (
            <a
              href={`/items/incomplete?idx=${nextIdx}`}
              class="btn-secondary btn-small"
            >
              {t("items.triageNext")}
            </a>
          )
          : (
            <span
              class="btn-secondary btn-small btn-disabled"
              aria-disabled="true"
            >
              {t("items.triageNext")}
            </span>
          )}
      </div>

      {thumbnailUrl && (
        <div class="triage-thumbnail">
          <img
            src={thumbnailUrl}
            alt={displayName}
            class="photo-gallery-img"
            loading="lazy"
          />
        </div>
      )}

      <h2 class="triage-item-name">{displayName}</h2>

      {error && <p class="error">{error}</p>}

      <form method="post" action={`/items/incomplete?idx=${idx}`}>
        <input type="hidden" name="csrf_token" value={csrfToken} />
        <input type="hidden" name="itemId" value={item.id} />

        <label>
          {t("items.name_label")}
          <input type="text" name="name" value={item.name} />
        </label>

        <label>
          {t("items.category_label")}
          <select name="categoryId">
            <option value="" selected={item.categoryId === null}>
              – {t("items.category_label")} –
            </option>
            {categories.map((c) => (
              <option
                key={c.id}
                value={c.id}
                selected={c.id === item.categoryId}
              >
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <ItemLocationFields
          rooms={rooms}
          boxes={boxes.map((b) => ({
            id: b.id,
            code: b.code,
            label: b.label,
          }))}
          initialContainerId={item.containerId}
          initialContainerName={containerName}
          initialRoomId={item.roomId}
          initialBoxId={item.boxId}
          initialDerivedRoomId={derivedRoomId}
        />

        <label>
          {t("items.quantity_label")}
          <input
            type="number"
            name="quantity"
            min="1"
            step="1"
            value={item.quantity}
            required
          />
        </label>

        <label>
          {t("items.value_label")}
          <input
            type="number"
            name="estimatedValue"
            min="0"
            step="0.01"
            value={item.estimatedValue ?? ""}
          />
        </label>

        <SchemaFields schema={schema} metadata={item.metadata} />

        <div class="form-actions">
          <button
            type="submit"
            name="status"
            value="complete"
            class="btn-primary"
          >
            {t("items.saveComplete")}
          </button>
          <button
            type="submit"
            name="status"
            value="incomplete"
            class="btn-secondary"
          >
            {t("items.saveIncomplete")}
          </button>
          <a href={`/items/${item.id}/edit`} class="btn-secondary">
            {t("action.edit")}
          </a>
        </div>
      </form>
    </main>
  );
}

async function buildPageData(item: Item, ctx: {
  csrfToken?: string;
  error?: string | null;
  items: Item[];
  idx: number;
}): Promise<PageProps> {
  const [categories, rooms, boxes] = await Promise.all([
    listCategories(),
    listRooms(),
    listBoxes(),
  ]);
  const category = item.categoryId ? await findCategory(item.categoryId) : null;
  const schema = await resolveSchema(category?.schemaType ?? "generic");

  let containerName: string | null = null;
  let derivedRoomId: string | null = null;
  if (item.containerId) {
    const containerItem = await findItem(item.containerId);
    containerName = containerItem?.name ?? null;
    derivedRoomId = await resolveRoom(item);
  }

  let thumbnailUrl: string | null = null;
  if (item.photos.length > 0) {
    try {
      const r2cfg = getR2Config();
      const nowSec = Math.floor(Date.now() / 1000);
      thumbnailUrl = presignGet(r2cfg, item.photos[0], nowSec);
    } catch { /* R2 not configured */ }
  }

  return {
    items: ctx.items,
    idx: ctx.idx,
    item,
    categories,
    schema,
    rooms,
    boxes,
    error: ctx.error ?? null,
    csrfToken: ctx.csrfToken ?? "",
    thumbnailUrl,
    containerName,
    derivedRoomId,
  };
}

export const handler = define.handlers({
  async GET(ctx) {
    const allItems = await listItems();
    const items = allItems
      .filter((i) => i.status === "incomplete")
      .sort((a, b) => a.createdAt - b.createdAt);

    if (items.length === 0) {
      return ctx.render(<EmptyPage />);
    }

    const idxParam = parseInt(ctx.url.searchParams.get("idx") ?? "0", 10);
    const idx = Math.max(0, Math.min(idxParam, items.length - 1));
    const item = items[idx];

    const props = await buildPageData(item, {
      csrfToken: ctx.state.csrfToken,
      items,
      idx,
    });
    return ctx.render(<TriagePage {...props} />);
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const itemId = (form.get("itemId") as string | null) ?? "";
    const item = itemId ? await findItem(itemId) : null;
    if (!item) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/items/incomplete" },
      });
    }

    const idxParam = parseInt(ctx.url.searchParams.get("idx") ?? "0", 10);

    const name = ((form.get("name") as string | null) ?? "").trim();
    const categoryId = (form.get("categoryId") as string | null) || null;
    const containerId = (form.get("containerId") as string | null) ?? "";
    const roomId = (form.get("roomId") as string | null) ?? "";
    const boxId = (form.get("boxId") as string | null) ?? "";
    const quantityRaw = (form.get("quantity") as string | null) ?? "1";
    const valueRaw = (form.get("estimatedValue") as string | null) ?? "";
    const statusRaw = (form.get("status") as string | null) ?? "";
    const status: "incomplete" | "complete" = statusRaw === "incomplete"
      ? "incomplete"
      : "complete";
    const metadata = readMetadataFromForm(form);

    const allItems = await listItems();
    const items = allItems
      .filter((i) => i.status === "incomplete")
      .sort((a, b) => a.createdAt - b.createdAt);

    const renderError = async (error: string) => {
      const props = await buildPageData(item, {
        csrfToken: ctx.state.csrfToken,
        error,
        items,
        idx: idxParam,
      });
      return ctx.render(<TriagePage {...props} />);
    };

    const quantity = parseInt(quantityRaw, 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return renderError(t("items.error.quantity_invalid"));
    }

    const estimatedValue = valueRaw ? parseFloat(valueRaw) : null;

    try {
      await updateItem(item.id, {
        name,
        categoryId,
        containerId: containerId || null,
        roomId: roomId || null,
        boxId: boxId || null,
        quantity,
        estimatedValue: estimatedValue !== null && isNaN(estimatedValue)
          ? null
          : estimatedValue,
        metadata,
        status,
      });
    } catch (e) {
      if (e instanceof MetadataValidationError) {
        return renderError(t("items.error.metadata_invalid"));
      }
      throw e;
    }

    // After saving as complete: redirect to same idx (list shrinks, next item appears)
    // After saving as incomplete: advance to next item
    const nextIdx = status === "complete"
      ? Math.max(0, Math.min(idxParam, items.length - 2))
      : Math.min(idxParam + 1, items.length - 1);

    return new Response(null, {
      status: 302,
      headers: { Location: `/items/incomplete?idx=${nextIdx}` },
    });
  },
});
