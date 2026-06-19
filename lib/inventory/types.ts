export interface Category {
  id: string;
  name: string;
  schemaType: string;
  canContain: boolean;
  createdAt: number;
}

export interface Group {
  id: string;
  name: string;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}

export type FieldType = "text" | "number" | "enum" | "date" | "boolean";

export interface FieldDef {
  /** Stable machine key, used as a key in Item.metadata. */
  key: string;
  /** i18n key for the field's display label — never literal copy. */
  label: string;
  type: FieldType;
  /** i18n keys for allowed values; present iff type === "enum". */
  options?: string[];
}

export interface CategorySchema {
  schemaType: string;
  /** i18n key for the schema's display name. */
  label: string;
  /** Empty for the generic schema. */
  fields: FieldDef[];
}

export interface Room {
  id: string;
  name: string;
  createdAt: number;
}

export type BoxStatus = "empty" | "packed" | "delivered";

export interface Box {
  id: string;
  code: string;
  label: string | null;
  destinationRoomId: string | null;
  status: BoxStatus;
  createdAt: number;
  updatedAt: number;
}

export interface BoxTombstone {
  id: string;
  code: string;
  label: string | null;
  destinationRoomId: string | null;
  createdAt: number;
  deletedAt: number;
  reason: "unpacked" | "manual";
}

export type ItemStatus = "pending" | "suggested" | "confirmed";

export interface Item {
  id: string;
  name: string;
  categoryId: string | null;
  containerId: string | null;
  roomId: string | null;
  boxId: string | null;
  quantity: number;
  estimatedValue: number | null;
  /** Optional core field (ISO date), independent of any category schema. */
  warrantyUntil: string | null;
  /** Schema-specific values, keyed by the category schema's field keys. */
  metadata: Record<string, unknown>;
  photos: string[];
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
}
