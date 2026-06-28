'use client'
import { Component, type ReactNode } from 'react'

interface Props {
  /** Rendered in place of children when a render error is caught. */
  fallback: ReactNode
  children: ReactNode
}
interface State {
  hasError: boolean
}

/**
 * Class error boundary — the only way to catch render-time errors in React.
 * Wraps the Wger animation so a malformed payload or image-render fault
 * degrades to a fallback instead of crashing the whole fitness page.
 */
export class FitnessErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[FitnessErrorBoundary]', error instanceof Error ? error.message : error)
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
