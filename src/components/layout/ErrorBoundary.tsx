import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 p-8">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h1 className="text-xl font-semibold">
            予期しないエラーが発生しました
          </h1>
          {this.state.error && (
            <details className="max-w-lg rounded-md border bg-muted p-4 text-sm">
              <summary className="cursor-pointer font-medium">
                エラー詳細
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <Button onClick={this.handleReload}>ページを再読み込み</Button>
        </div>
      )
    }

    return this.props.children
  }
}
