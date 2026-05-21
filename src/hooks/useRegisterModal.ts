import { useEffect, useRef } from 'react';

/**
 * Custom hook to register modals to a global handler stack.
 * This intercepts browser/mobile back buttons to close active modals.
 *
 * Strategy:
 * - When a modal opens, we save the current history state and push a
 *   dummy entry { _modal: true } on top.
 * - Back button: browser pops the dummy entry → popstate fires →
 *   popstate handler closes the modal (no extra navigation needed).
 * - X button / manual close: we use replaceState to swap the current
 *   dummy entry back to the state that was there before the modal opened.
 *   This removes the dummy entry WITHOUT calling history.back()
 *   (which is async and causes cascading popstate events).
 *
 * @param isOpen Boolean indicating if the modal is currently open
 * @param onClose Callback function to close the modal
 */
export function useRegisterModal(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Save the history state that existed BEFORE we pushed the modal entry
  const stateBeforeModal = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof window === 'undefined') return;

    const win = window as any;
    if (!win._modalCloseStack) win._modalCloseStack = [];

    // Save current state before pushing modal entry
    stateBeforeModal.current = window.history.state ?? { tab: 'stats' };

    const handler = () => {
      onCloseRef.current();
    };

    // Push a dummy history entry for this modal
    window.history.pushState({ _modal: true }, '', '');

    // Register the close handler on the stack
    win._modalCloseStack.push(handler);

    return () => {
      // Remove handler from the stack
      const index = win._modalCloseStack.indexOf(handler);
      if (index !== -1) {
        win._modalCloseStack.splice(index, 1);
      }

      // If closed via back button, the popstate handler already consumed
      // our dummy entry. Do nothing - the browser went back naturally.
      if (win._modalClosedByBack) {
        win._modalClosedByBack = false;
        return;
      }

      // Closed manually (X button, click outside, programmatic close, etc.)
      // Replace the dummy modal history entry with the state from before the modal
      // was opened. This avoids async cascading from history.back().
      const currState = window.history.state;
      if (currState && currState._modal) {
        window.history.replaceState(stateBeforeModal.current, '', '');
      }
    };
  }, [isOpen]);
}
