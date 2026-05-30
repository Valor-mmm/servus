import { useSignal } from "@preact/signals";
import { t } from "@/lib/i18n/t.ts";

interface Props {
  itemId: string;
  initialQuantity: number;
  csrfToken: string;
  readonly: boolean;
}

export default function QuantityControl(
  { itemId, initialQuantity, csrfToken, readonly }: Props,
) {
  const quantity = useSignal(initialQuantity);
  const busy = useSignal(false);

  if (readonly) {
    return <span class="qty-label">{`×${quantity.value}`}</span>;
  }

  async function adjust(delta: 1 | -1) {
    if (busy.value) return;
    const prev = quantity.value;
    quantity.value = Math.max(1, prev + delta);
    busy.value = true;
    try {
      const res = await fetch("/api/items/adjust-quantity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ itemId, delta }),
      });
      if (res.ok) {
        const data = await res.json() as { quantity: number };
        quantity.value = data.quantity;
      } else {
        quantity.value = prev;
      }
    } catch {
      quantity.value = prev;
    } finally {
      busy.value = false;
    }
  }

  return (
    <span class="qty-controls">
      <button
        type="button"
        class="btn-small"
        aria-label={t("items.qty_dec_aria")}
        disabled={busy.value}
        onClick={() => adjust(-1)}
      >
        {t("items.qty_dec")}
      </button>
      <span class="qty-label">{`×${quantity.value}`}</span>
      <button
        type="button"
        class="btn-small"
        aria-label={t("items.qty_inc_aria")}
        disabled={busy.value}
        onClick={() => adjust(1)}
      >
        {t("items.qty_inc")}
      </button>
    </span>
  );
}
