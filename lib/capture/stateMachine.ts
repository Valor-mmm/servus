export type CaptureState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "in-progress"; itemId: string; thumbnails: string[] }
  | { phase: "closed" };

export type CaptureAction =
  | { type: "CAMERA_READY" }
  | { type: "ITEM_CREATED"; itemId: string; thumbnailUrl: string }
  | { type: "PHOTO_ADDED"; thumbnailUrl: string }
  | { type: "CONFIRM" }
  | { type: "CLOSE" };

export const initialCaptureState: CaptureState = { phase: "idle" };

export function captureReducer(
  state: CaptureState,
  action: CaptureAction,
): CaptureState {
  switch (action.type) {
    case "CAMERA_READY":
      return state.phase === "idle" ? { phase: "starting" } : state;

    case "ITEM_CREATED":
      return state.phase === "starting"
        ? {
          phase: "in-progress",
          itemId: action.itemId,
          thumbnails: [action.thumbnailUrl],
        }
        : state;

    case "PHOTO_ADDED":
      return state.phase === "in-progress"
        ? {
          ...state,
          thumbnails: [...state.thumbnails, action.thumbnailUrl],
        }
        : state;

    case "CONFIRM":
      return state.phase === "in-progress" ? { phase: "starting" } : state;

    case "CLOSE":
      return { phase: "closed" };
  }
}
