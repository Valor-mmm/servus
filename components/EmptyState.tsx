export function EmptyState({ message }: { message: string }) {
  return (
    <div class="empty-state">
      <img src="/lion.svg" alt="" aria-hidden="true" class="empty-state-icon" />
      <p>{message}</p>
    </div>
  );
}
