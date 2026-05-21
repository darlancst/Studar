import { useEffect, useRef } from 'react';

/**
 * Custom hook para registrar modais no handler global de botão voltar.
 *
 * Estratégia (sentinel único para todos os modais):
 * - Quando o PRIMEIRO modal abre: salva o estado atual e empilha UMA entrada
 *   sentinel { _modalSentinel: true } no histórico.
 * - Modais subsequentes: apenas se registram no stack, sem empilhar mais entradas.
 * - Botão voltar: o browser consome o sentinel → popstate fecha o modal do topo
 *   e re-empilha o sentinel se houver mais modais abertos.
 * - Fechamento manual (X): se for o último modal, substitui o sentinel pela
 *   entrada anterior via replaceState (síncrono, sem disparar popstate).
 */

// Contagem global de modais abertos (module-level, persiste entre renders)
let openModalCount = 0;
// Estado do histórico anterior ao primeiro modal
let stateBeforeModals: any = null;

export function useRegisterModal(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined') return;

    const win = window as any;
    if (!win._modalCloseStack) win._modalCloseStack = [];

    const handler = () => {
      onCloseRef.current();
    };

    openModalCount++;
    if (openModalCount === 1) {
      // Primeiro modal: salva estado atual e empilha sentinel
      stateBeforeModals = window.history.state ?? { tab: 'stats' };
      window.history.pushState({ ...window.history.state, _modalSentinel: true }, '', '');
    }
    // Modais subsequentes não empilham mais entradas

    win._modalCloseStack.push(handler);

    return () => {
      // Remove handler do stack
      const index = win._modalCloseStack.indexOf(handler);
      if (index !== -1) {
        win._modalCloseStack.splice(index, 1);
      }
      openModalCount--;

      // Se fechado pelo botão voltar: o popstate handler já gerencia o sentinel
      if (win._modalClosedByBack) {
        win._modalClosedByBack = false;
        return;
      }

      // Fechado manualmente (X, clique fora, etc.)
      if (openModalCount === 0) {
        // Último modal fechado: remove o sentinel substituindo pelo estado anterior
        const currState = window.history.state;
        if (currState && currState._modalSentinel) {
          window.history.replaceState({ ...stateBeforeModals }, '', '');
        }
        stateBeforeModals = null;
      }
      // Se ainda há modais abertos, o sentinel permanece para o próximo "voltar"
    };
  }, [isOpen]);
}
