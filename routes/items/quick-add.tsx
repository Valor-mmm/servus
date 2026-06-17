import { define } from "@/utils.ts";
import { t } from "@/lib/i18n/t.ts";
import NativePhotoCapture from "@/islands/NativePhotoCapture.tsx";

interface PageProps {
  csrfToken: string;
}

function QuickAddPage({ csrfToken }: PageProps) {
  return (
    <main class="page">
      <div class="page-header">
        <h1>{t("items.quick_add_title")}</h1>
        <a href="/items" class="btn-secondary">{t("action.back")}</a>
      </div>
      <NativePhotoCapture mode="create-from-photo" csrfToken={csrfToken} />
    </main>
  );
}

export const handler = define.handlers({
  GET(ctx) {
    return ctx.render(
      <QuickAddPage csrfToken={ctx.state.csrfToken ?? ""} />,
    );
  },
});
