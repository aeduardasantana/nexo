// @signature edufertanapo
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

type ErrorBoundaryState = { failed: boolean };

class NexoErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('NEXO_INTERFACE_ERROR', error, info);
  }

  restartPreservingBackup = () => {
    const sessionKey = 'nexo.session.v1';
    const storedSession = window.localStorage.getItem(sessionKey);
    if (storedSession) {
      window.localStorage.setItem(`nexo.session.recovery.${Date.now()}`, storedSession);
      window.localStorage.removeItem(sessionKey);
    }
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="nexo-recovery" role="alert">
        <div>
          <p>NEXO - RECUPERAÇÃO DA INTERFACE</p>
          <h1>A TELA NÃO CONSEGUIU CONCLUIR ESTA AÇÃO</h1>
          <p>SUA SESSÃO FOI MANTIDA NESTE NAVEGADOR.</p>
          <div>
            <button type="button" onClick={() => window.location.reload()}>TENTAR NOVAMENTE</button>
            <button type="button" onClick={this.restartPreservingBackup}>ABRIR UMA SESSÃO LIMPA</button>
          </div>
          <small>AO ABRIR UMA SESSÃO LIMPA, O NEXO GUARDA UMA CÓPIA TÉCNICA DA SESSÃO ANTERIOR NESTE NAVEGADOR.</small>
        </div>
      </main>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NexoErrorBoundary>
      <App />
    </NexoErrorBoundary>
  </React.StrictMode>,
);
