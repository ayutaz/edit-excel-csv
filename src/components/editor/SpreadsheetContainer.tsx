interface SpreadsheetContainerProps {
  containerId: string
  className?: string
}

export function SpreadsheetContainer({
  containerId,
  className,
}: SpreadsheetContainerProps) {
  return (
    <div
      id={containerId}
      className={className}
      style={{ width: "100%", height: "100%", position: "relative" }}
    />
  )
}
