import { Component, type ReactNode } from "react";
import { Button } from "./ui/button";
import { PageShell, BackBar, EmptyState } from "./design-system";

interface Props {
  onReset?: () => void;
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  private reset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <PageShell>
          <BackBar onBack={this.reset} />
          <EmptyState
            title="Algo não funcionou"
            body="Ocorreu um erro ao carregar esta tela. Volte ao início e tente novamente."
          />
          {import.meta.env.DEV && (
            <p className="mt-2 break-words border-t border-white/[0.06] pt-4 font-mono text-[11.5px] text-zinc-600">
              {String(this.state.error)}
            </p>
          )}
          <div className="mt-6">
            <Button variant="secondary" onClick={this.reset}>
              Tentar novamente
            </Button>
          </div>
        </PageShell>
      );
    }
    return this.props.children;
  }
}