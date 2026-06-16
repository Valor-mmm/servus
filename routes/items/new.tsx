import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import { createItem } from "@/lib/inventory/itemRepo.ts";
import { listCategories } from "@/lib/inventory/categoryRepo.ts";
import { resolveSchema } from "@/lib/inventory/schemaRepo.ts";
import { MetadataValidationError } from "@/lib/inventory/validateMetadata.ts";
import { readMetadataFromForm } from "@/components/SchemaFields.tsx";
import {
  addMembership,
  findOrCreateGroup,
  listGroups,
} from "@/lib/inventory/groupRepo.ts";
import { listRooms } from "@/lib/inventory/roomRepo.ts";
import { listBoxes } from "@/lib/inventory/boxRepo.ts";
import type { BoxWithItemCount } from "@/lib/inventory/boxRepo.ts";
import type { CategorySchema, Room } from "@/lib/inventory/types.ts";
import ItemCategoryFields from "@/islands/ItemCategoryFields.tsx";
import GroupAutocomplete from "@/islands/GroupAutocomplete.tsx";
import PhotoAttach from "@/islands/PhotoAttach.tsx";
import CaptureSurface from "@/components/CaptureSurface.tsx";

interface PageProps {
  categories: { id: string; name: string }[];
  schemas: Record<string, CategorySchema>;
  rooms: Room[];
  boxes: BoxWithItemCount[];
  groupNames: string[];
  error: string | null;
  csrfToken: string;
}

function NewItemPage(
  { categories, schemas, rooms, boxes, groupNames, error, csrfToken }:
    PageProps,
) {
  return (
    <main class="page">
      <h1>{t("items.new_title")}</h1>
      {error && <p class="error">{error}</p>}
      <form method="post" action="/items/new">
        <input type="hidden" name="csrf_token" value={csrfToken} />

        <label>
          {t("items.name_label")}
          <input
            type="text"
            name="name"
            placeholder={t("items.name_placeholder")}
            required
          />
        </label>

        <ItemCategoryFields categories={categories} schemas={schemas} />

        <label>
          {t("items.room_label")}
          <select name="roomId">
            <option value="">{t("items.no_room")}</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}
            </option>)}
          </select>
        </label>

        <label>
          {t("items.box_label")}
          <select name="boxId">
            <option value="">{t("items.no_box")}</option>
            {boxes.map((b) => (
              <option key={b.id} value={b.id}>
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
            value="1"
            required
          />
        </label>

        <label>
          {t("items.value_label")}
          <input type="number" name="estimatedValue" min="0" step="0.01" />
        </label>

        <label>
          {t("items.warranty_label")}
          <input type="date" name="warrantyUntil" />
        </label>

        <label>
          {t("items.add_to_group")}
          <GroupAutocomplete name="groupName" suggestions={groupNames} />
        </label>

        <div class="new-item-photos">
          <span class="field-heading">{t("items.photos_label")}</span>
          <PhotoAttach csrfToken={csrfToken} />
        </div>

        <button type="submit">{t("action.save")}</button>
        <a href="/items">{t("action.cancel")}</a>
      </form>

      <CaptureSurface csrfToken={csrfToken} />
    </main>
  );
}

async function loadFormData() {
  const [categories, rooms, boxes, groups] = await Promise.all([
    listCategories(),
    listRooms(),
    listBoxes(),
    listGroups(),
  ]);
  const schemas: Record<string, CategorySchema> = {};
  for (const c of categories) {
    schemas[c.id] = await resolveSchema(c.schemaType);
  }
  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    schemas,
    rooms,
    boxes,
    groupNames: groups.map((g) => g.name),
  };
}

export const handler = define.handlers({
  async GET(ctx) {
    const data = await loadFormData();
    return ctx.render(
      <NewItemPage
        {...data}
        error={null}
        csrfToken={ctx.state.csrfToken ?? ""}
      />,
    );
  },

  async POST(ctx) {
    const form = await ctx.req.formData();
    const name = ((form.get("name") as string | null) ?? "").trim();
    const categoryId = (form.get("categoryId") as string | null) ?? "";
    const roomId = (form.get("roomId") as string | null) ?? "";
    const boxId = (form.get("boxId") as string | null) ?? "";
    const quantityRaw = (form.get("quantity") as string | null) ?? "1";
    const valueRaw = (form.get("estimatedValue") as string | null) ?? "";
    const warrantyRaw = (form.get("warrantyUntil") as string | null) ?? "";
    const groupName = ((form.get("groupName") as string | null) ?? "").trim();
    const photos = form.getAll("photoKey").map((v) => String(v)).filter((v) =>
      v !== ""
    );
    const metadata = readMetadataFromForm(form);

    const renderError = async (error: string) => {
      const data = await loadFormData();
      return ctx.render(
        <NewItemPage
          {...data}
          error={error}
          csrfToken={ctx.state.csrfToken ?? ""}
        />,
      );
    };

    if (!name) return renderError(t("items.error.name_required"));
    if (!categoryId) return renderError(t("items.error.category_required"));

    const quantity = parseInt(quantityRaw, 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return renderError(t("items.error.quantity_invalid"));
    }

    const estimatedValue = valueRaw ? parseFloat(valueRaw) : null;
    let item;
    try {
      item = await createItem({
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
        photos,
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

    if (groupName) {
      const group = await findOrCreateGroup(groupName);
      await addMembership(group.id, item.id);
    }

    return new Response(null, { status: 302, headers: { Location: "/items" } });
  },
});
