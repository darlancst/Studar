import { useEffect, useRef } from 'react';

/**
 * Custom hook to register modals to a global handler stack.
 * This intercepts browser/mobile back buttons to close active modals.
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
    win.modalCloseHandlers = win.modalCloseHandlers || [];

    const handler = () => {
      onCloseRef.current();
    };

    // Register our modal close callback
    win.modalCloseHandlers.push(handler);

    // Push dummy state to browser history to intercept back action
    window.history.pushState({ isModal: true }, '', '');

    return () => {
      const index = win.modalCloseHandlers.indexOf(handler);
      if (index !== -1) {
        // If the handler is still in the list, it means the modal was closed manually 
        // (not via the popstate listener, which pops it before executing).
        win.modalCloseHandlers.splice(index, 1);

        // Tell the global popstate handler to ignore the popstate event from going back
        win.ignoreNextPopState = true;
        window.history.back();
      }
    };
  }, [isOpen]);
}
