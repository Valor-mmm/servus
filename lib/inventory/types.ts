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

export type ItemStatus = "pending" | "suggested" | "confirmed";

export interface Item {
  id: string;
  name: string;
  categoryId: string;
  roomId: string | null;
  estimatedValue: number | null;
  photoKey: string | null;
  status: ItemStatus;
  createdAt: number;
  updatedAt: number;
}
