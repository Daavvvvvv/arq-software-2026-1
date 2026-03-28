type KitchenEmptyStateProps = {
  title: string
  description: string
}

function KitchenEmptyState({
  title,
  description,
}: KitchenEmptyStateProps) {
  return (
    <div className="kitchen-empty-state">
      <div className="kitchen-empty-state__icon">🍳</div>
      <h2 className="kitchen-empty-state__title">{title}</h2>
      <p className="kitchen-empty-state__description">{description}</p>
    </div>
  )
}

export default KitchenEmptyState