import { useEffect, useRef } from 'react';

/**
 * Custom hook to register modals to a global handler stack.
 *
 * Strategy (simples, sem flags de coordenação):
 * - Quando modal abre: salva o estado atual, empilha { _modal: true }.
 * - Botão voltar: browser vai para a entrada anterior; popstate fecha o modal e retorna sem navegar tabs.
 * - Fechamento manual (X): cleanup verifica se o estado atual ainda é { _modal: true };
 *   se sim, substitui pelo estado anterior via replaceState (síncrono, sem disparar popstate).
 *   Se não (back button já consumiu a entrada), não faz nada.
 */
export function useRegisterModal(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Estado do histórico antes de abrir o modal
  const stateBeforeModal = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    const win = window as any;
    if (!win._modalCloseStack) win._modalCloseStack = [];

    // Salva o estado atual antes de empilhar a entrada do modal
    stateBeforeModal.current = window.history.state ?? { tab: 'stats' };

    const handler = () => {
      onCloseRef.current();
    };

    // Empilha uma entrada dummy para este modal
    window.history.pushState({ _modal: true }, '', '');
    win._modalCloseStack.push(handler);

    return () => {
      // Remove o handler do stack
      const index = win._modalCloseStack.indexOf(handler);
      if (index !== -1) {
        win._modalCloseStack.splice(index, 1);
      }

      // Verifica o estado ATUAL do histórico:
      // - Se ainda é { _modal: true }: o modal foi fechado manualmente (X).
      //   Substitui pela entrada anterior (replaceState é síncrono, não dispara popstate).
      // - Se não é { _modal: true }: o botão voltar já consumiu a entrada dummy.
      //   O popstate já foi tratado. Não faz nada.
      const currState = window.history.state;
      if (currState && currState._modal) {
        window.history.replaceState(stateBeforeModal.current, '', '');
      }
    };
  }, [isOpen]);
}
