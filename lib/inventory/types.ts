export interface Category {
  id: string;
  name: string;
  createdAt: number;
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
  roomId: string | null;
  boxId: string | null;
  quantity: number;
  estimatedValue: number | null;
  photoKey: string | null;
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
}
