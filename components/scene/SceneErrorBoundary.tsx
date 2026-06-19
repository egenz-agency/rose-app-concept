"use client"
import { Component, type ReactNode } from "react"

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(err: Error) {
    console.error("[SceneErrorBoundary]", err.message)
  }

  render() {
    if (this.state.hasError) return null  // scene fails silently; UI layers still show
    return this.props.children
  }
}
