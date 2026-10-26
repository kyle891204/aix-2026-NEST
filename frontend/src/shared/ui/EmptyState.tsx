interface EmptyStateProps {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <p className="eyebrow">TEAM 03</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  )
}
