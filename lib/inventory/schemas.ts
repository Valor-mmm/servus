import type { CategorySchema, FieldDef } from "@/lib/inventory/types.ts";

// Seeded, hardcoded-but-data-shaped category schema catalogue.
//
// Labels and enum options are i18n KEYS (resolved through `t()` at render
// time), never literal copy — see CLAUDE.md §11. Field keys are stable machine
// identifiers stored in Item.metadata.
//
// This is the only place the catalogue is defined. The rest of the app reads it
// through `getSchema` / `listSchemaTypes`, so the source can later move to KV
// (user-defined schemas) without touching callers.

const GENERIC = "generic";

// Reusable field helpers — keep field labels in a single `field.<key>`
// namespace so identical fields (brand, color, material, …) share one string.
const text = (key: string): FieldDef => ({
  key,
  label: `field.${key}`,
  type: "text",
});
const number = (key: string): FieldDef => ({
  key,
  label: `field.${key}`,
  type: "number",
});
const boolean = (key: string): FieldDef => ({
  key,
  label: `field.${key}`,
  type: "boolean",
});
const enumField = (key: string, options: string[]): FieldDef => ({
  key,
  label: `field.${key}`,
  type: "enum",
  options,
});

const POWER = [
  "option.power.manual",
  "option.power.corded",
  "option.power.cordless",
];
const SIZE = [
  "option.size.xs",
  "option.size.s",
  "option.size.m",
  "option.size.l",
  "option.size.xl",
  "option.size.xxl",
  "option.size.xxxl",
];
const SEASON = [
  "option.season.spring",
  "option.season.summer",
  "option.season.autumn",
  "option.season.winter",
];
const CONDITION = [
  "option.condition.new",
  "option.condition.good",
  "option.condition.used",
  "option.condition.defective",
];
const TEXTILE_TYPE = [
  "option.textiletype.bedding",
  "option.textiletype.towel",
  "option.textiletype.curtain",
  "option.textiletype.blanket",
];

const SCHEMAS: CategorySchema[] = [
  { schemaType: GENERIC, label: "schema.generic", fields: [] },
  {
    schemaType: "book",
    label: "schema.book",
    fields: [
      text("author"),
      text("isbn"),
      text("publisher"),
      number("year"),
      text("series"),
      number("volume"),
      text("ageRange"),
    ],
  },
  {
    schemaType: "tool",
    label: "schema.tool",
    fields: [text("brand"), text("toolType"), enumField("power", POWER)],
  },
  {
    schemaType: "clothing",
    label: "schema.clothing",
    fields: [
      text("type"),
      text("brand"),
      enumField("size", SIZE),
      text("color"),
      enumField("season", SEASON),
    ],
  },
  {
    schemaType: "clothing-numeric",
    label: "schema.clothing-numeric",
    fields: [
      text("type"),
      text("brand"),
      number("sizeNumber"),
      text("color"),
      enumField("season", SEASON),
    ],
  },
  {
    schemaType: "clothing-trousers",
    label: "schema.clothing-trousers",
    fields: [
      text("brand"),
      number("waistCm"),
      number("lengthCm"),
      text("color"),
      enumField("season", SEASON),
    ],
  },
  {
    schemaType: "electronics",
    label: "schema.electronics",
    fields: [
      text("brand"),
      text("model"),
      text("serial"),
      number("purchaseYear"),
      text("deviceType"),
    ],
  },
  {
    schemaType: "furniture",
    label: "schema.furniture",
    fields: [
      text("manufacturer"),
      text("material"),
      text("color"),
      text("articleNumber"),
      number("widthCm"),
      number("heightCm"),
      number("depthCm"),
    ],
  },
  {
    schemaType: "appliance",
    label: "schema.appliance",
    fields: [
      text("brand"),
      text("model"),
      text("capacity"),
      number("powerWatts"),
      number("purchaseYear"),
      enumField("condition", CONDITION),
    ],
  },
  {
    schemaType: "toy",
    label: "schema.toy",
    fields: [
      text("brand"),
      text("setName"),
      text("setNumber"),
      number("pieceCount"),
      boolean("complete"),
      text("ageRange"),
    ],
  },
  {
    schemaType: "instrument",
    label: "schema.instrument",
    fields: [text("instrumentType"), text("brand")],
  },
  {
    schemaType: "kitchenware",
    label: "schema.kitchenware",
    fields: [text("material")],
  },
  {
    schemaType: "textiles",
    label: "schema.textiles",
    fields: [
      enumField("type", TEXTILE_TYPE),
      text("size"),
      text("material"),
      text("color"),
    ],
  },
  {
    schemaType: "valuables",
    label: "schema.valuables",
    fields: [text("material"), text("gemstone"), text("certificateNo")],
  },
  {
    schemaType: "folder",
    label: "schema.folder",
    fields: [text("person")],
  },
  {
    schemaType: "storagebox",
    label: "schema.storagebox",
    fields: [
      text("material"),
      number("widthCm"),
      number("heightCm"),
      number("depthCm"),
    ],
  },
];

const BY_TYPE = new Map(SCHEMAS.map((s) => [s.schemaType, s]));

export const GENERIC_TYPE = GENERIC;

/**
 * Returns the seeded built-in schema for a type, falling back to generic for
 * unknown types. This is the seed layer; the KV overlay (schemaRepo) is checked
 * ahead of this by `resolveSchema`.
 */
export function getSchema(schemaType: string): CategorySchema {
  return BY_TYPE.get(schemaType) ?? BY_TYPE.get(GENERIC)!;
}

/** The seeded built-in schema for a type, or undefined if not a built-in. */
export function getSeedSchema(schemaType: string): CategorySchema | undefined {
  return BY_TYPE.get(schemaType);
}

/** True if the schemaType is a seeded built-in (generic included). */
export function isBuiltinSchemaType(schemaType: string): boolean {
  return BY_TYPE.has(schemaType);
}

/** Back-compat alias: a known built-in schemaType. */
export const isKnownSchemaType = isBuiltinSchemaType;

/** All seeded built-in schema types with their label i18n keys, in order. */
export function listSeedSchemaTypes(): { schemaType: string; label: string }[] {
  return SCHEMAS.map((s) => ({ schemaType: s.schemaType, label: s.label }));
}

/** Back-compat alias used by callers that only need the built-in list. */
export const listSchemaTypes = listSeedSchemaTypes;
