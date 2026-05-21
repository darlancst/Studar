import { useEffect, useRef } from 'react';

/**
 * Custom hook to register modals to a global handler stack.
 * This intercepts browser/mobile back buttons to close active modals.
 *
 * Strategy:
 * - When a modal opens, we push a dummy history entry ({_modal: true}).
 * - When the user presses "back", the browser pops this dummy entry,
 *   triggering popstate. The popstate handler closes the modal.
 * - When the user closes manually (X button), we call history.back()
 *   to remove the dummy entry, with a skip flag so the popstate handler ignores it.
 *
 * @param isOpen Boolean indicating if the modal is currently open
 * @param onClose Callback function to close the modal
 */
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

      // If closed via back button, the popstate handler already set this flag.
      // The browser already consumed our dummy entry, so don't call back() again.
      if (win._modalClosedByBack) {
        win._modalClosedByBack = false;
        return;
      }

      // Closed manually (X button, click outside, programmatic close, etc.)
      // We need to remove our dummy history entry.
      // Only do this if the current state is still our modal entry.
      // If other pushStates happened after ours (e.g., tab navigation while modal was open),
      // the dummy entry is buried and will be handled naturally when the user navigates back.
      const currState = window.history.state;
      if (currState && currState._modal) {
        win._skipPopStateCount = (win._skipPopStateCount || 0) + 1;
        window.history.back();
      }
    };
  }, [isOpen]);
}
