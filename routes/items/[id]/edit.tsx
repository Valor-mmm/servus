import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { findItem, updateItem } from "@/lib/inventory/itemRepo.ts";
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
import { ItemGroupsEditor } from "@/components/ItemGroupsEditor.tsx";
import {
  addMembership,
  findOrCreateGroup,
  listGroups,
  listItemGroups,
  removeMembership,
} from "@/lib/inventory/groupRepo.ts";
import type { Group } from "@/lib/inventory/types.ts";
import NativePhotoCapture from "@/islands/NativePhotoCapture.tsx";
import { getR2Config } from "@/lib/photos/config.ts";
import { presignGet } from "@/lib/photos/signing.ts";

interface PageProps {
  item: Item;
  categories: Category[];
  schema: CategorySchema;
  rooms: Room[];
  boxes: BoxWithItemCount[];
  groups: Group[];
  allGroupNames: string[];
  error: string | null;
  csrfToken: string;
  photoUrls: string[]; // presigned URLs for each photo in order
}

async function schemaForItem(item: Item): Promise<CategorySchema> {
  const category = item.categoryId ? await findCategory(item.categoryId) : null;
  return resolveSchema(category?.schemaType ?? "generic");
}

function EditItemPage(
  {
    item,
    categories,
    schema,
    rooms,
    boxes,
    groups,
    allGroupNames,
    error,
    csrfToken,
    photoUrls,
  }: PageProps,
) {
  return (
    <main class="page">
      <h1>{t("items.edit_title")}</h1>
      {error && <p class="error">{error}</p>}

      {photoUrls.length > 0 && (
        <section class="photo-gallery">
          {photoUrls.map((url, i) => (
            <div key={i} class="photo-gallery-item">
              <img src={url} alt="" class="photo-gallery-img" loading="lazy" />
              <form
                method="post"
                action={`/items/${item.id}/edit`}
                style="display:inline"
              >
                <input type="hidden" name="csrf_token" value={csrfToken} />
                <input type="hidden" name="_action" value="remove_photo" />
                <input type="hidden" name="photoKey" value={item.photos[i]} />
                <button type="submit" class="btn-small btn-danger">
                  {t("items.removePhoto")}
                </button>
              </form>
            </div>
          ))}
        </section>
      )}

      <NativePhotoCapture
        mode="append-to-existing"
        itemId={item.id}
        csrfToken={csrfToken}
      />

      <form method="post" action={`/items/${item.id}/edit`}>
        <input type="hidden" name="csrf_token" value={csrfToken} />

        <label>
          {t("items.name_label")}
          <input type="text" name="name" value={item.name} required />
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

        <label>
          {t("items.room_label")}
          <select name="roomId">
            <option
              value=""
              selected={item.roomId === null && item.boxId === null}
            >
              {t("items.no_room")}
            </option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id} selected={r.id === item.roomId}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t("items.box_label")}
          <select name="boxId">
            <option value="" selected={item.boxId === null}>
              {t("items.no_box")}
            </option>
            {boxes.map((b) => (
              <option key={b.id} value={b.id} selected={b.id === item.boxId}>
                {b.code}
                {b.label ? ` – ${b.label}` : ""}
              </option>
            ))}
          </select>
        </label>

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

        <label>
          {t("items.warranty_label")}
          <input
            type="date"
            name="warrantyUntil"
            value={item.warrantyUntil ?? ""}
          />
        </label>

        <SchemaFields schema={schema} metadata={item.metadata} />

        <button type="submit">{t("action.save")}</button>
        <a href={`/items/${item.id}`}>{t("action.cancel")}</a>
      </form>

      <ItemGroupsEditor
        itemId={item.id}
        groups={groups}
        allGroupNames={allGroupNames}
        csrfToken={csrfToken}
      />
    </main>
  );
}

async function groupData(
  itemId: string,
): Promise<{ groups: Group[]; allGroupNames: string[] }> {
  const [groups, all] = await Promise.all([
    listItemGroups(itemId),
    listGroups(),
  ]);
  return { groups, allGroupNames: all.map((g) => g.name) };
}

function buildPhotoUrls(photos: string[]): string[] {
  try {
    const r2cfg = getR2Config();
    const nowSec = Math.floor(Date.now() / 1000);
    return photos.map((key) => presignGet(r2cfg, key, nowSec));
  } catch {
    return photos.map(() => "");
  }
}

export const handler = define.handlers({
  async GET(ctx) {
    const item = await findItem(ctx.params.id);
    if (!item) return new Response(t("error.not_found"), { status: 404 });

    const [categories, rooms, boxes, schema, { groups, allGroupNames }] =
      await Promise.all([
        listCategories(),
        listRooms(),
        listBoxes(),
        schemaForItem(item),
        groupData(item.id),
      ]);
    const photoUrls = buildPhotoUrls(item.photos);
    return ctx.render(
      <EditItemPage
        item={item}
        categories={categories}
        schema={schema}
        rooms={rooms}
        boxes={boxes}
        groups={groups}
        allGroupNames={allGroupNames}
        error={null}
        csrfToken={ctx.state.csrfToken ?? ""}
        photoUrls={photoUrls}
      />,
    );
  },

  async POST(ctx) {
    const item = await findItem(ctx.params.id);
    if (!item) return new Response(t("error.not_found"), { status: 404 });

    const form = await ctx.req.formData();
    const action = (form.get("_action") as string | null) ?? "";

    if (action === "remove_photo") {
      const photoKey = (form.get("photoKey") as string | null) ?? "";
      if (photoKey) {
        const { handleRemovePhoto } = await import(
          "@/lib/inventory/removePhotoApi.ts"
        );
        let r2cfg = null;
        try {
          const { getR2Config } = await import("@/lib/photos/config.ts");
          r2cfg = getR2Config();
        } catch { /* R2 not configured */ }
        await handleRemovePhoto({ itemId: item.id, photoKey }, r2cfg);
      }
      return new Response(null, {
        status: 302,
        headers: { Location: `/items/${item.id}/edit` },
      });
    }

    if (action === "add_group") {
      const groupName = ((form.get("groupName") as string | null) ?? "").trim();
      if (groupName) {
        const group = await findOrCreateGroup(groupName);
        await addMembership(group.id, item.id);
      }
      return new Response(null, {
        status: 302,
        headers: { Location: `/items/${item.id}/edit` },
      });
    }

    if (action === "remove_group") {
      const groupId = (form.get("groupId") as string | null) ?? "";
      if (groupId) await removeMembership(groupId, item.id);
      return new Response(null, {
        status: 302,
        headers: { Location: `/items/${item.id}/edit` },
      });
    }

    const name = ((form.get("name") as string | null) ?? "").trim();
    const categoryId = (form.get("categoryId") as string | null) || null;
    const roomId = (form.get("roomId") as string | null) ?? "";
    const boxId = (form.get("boxId") as string | null) ?? "";
    const quantityRaw = (form.get("quantity") as string | null) ?? "1";
    const valueRaw = (form.get("estimatedValue") as string | null) ?? "";

    const warrantyRaw = (form.get("warrantyUntil") as string | null) ?? "";
    const metadata = readMetadataFromForm(form);

    const renderError = async (error: string) => {
      const [categories, rooms, boxes, schema, { groups, allGroupNames }] =
        await Promise.all([
          listCategories(),
          listRooms(),
          listBoxes(),
          schemaForItem(item),
          groupData(item.id),
        ]);
      return ctx.render(
        <EditItemPage
          item={item}
          categories={categories}
          schema={schema}
          rooms={rooms}
          boxes={boxes}
          groups={groups}
          allGroupNames={allGroupNames}
          error={error}
          csrfToken={ctx.state.csrfToken ?? ""}
          photoUrls={buildPhotoUrls(item.photos)}
        />,
      );
    };

    if (!name) return renderError(t("items.error.name_required"));

    const quantity = parseInt(quantityRaw, 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return renderError(t("items.error.quantity_invalid"));
    }

    const estimatedValue = valueRaw ? parseFloat(valueRaw) : null;
    try {
      await updateItem(item.id, {
        name,
        categoryId,
        roomId: roomId || null,
        boxId: boxId || null,
        quantity,
        estimatedValue: estimatedValue !== null && isNaN(estimatedValue)
          ? null
          : estimatedValue,
        warrantyUntil: warrantyRaw || null,
        metadata,
      });
    } catch (e) {
      if (e instanceof MetadataValidationError) {
        return renderError(
          e.message.includes("warrantyUntil")
            ? t("items.error.warranty_invalid")
            : t("items.error.metadata_invalid"),
        );
      }
      throw e;
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `/items/${item.id}` },
    });
  },
});
