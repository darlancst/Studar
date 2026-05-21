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
    if (!win._modalCloseStack) win._modalCloseStack = [];

    const newModalCount = win._modalCloseStack.length + 1;

    // Push hash to history to indicate a modal is open
    window.location.hash = `modal-${newModalCount}`;

    const handler = () => {
      onCloseRef.current();
    };

    // Register our modal close callback
    win._modalCloseStack.push(handler);

    const registeredModalCount = newModalCount;

    return () => {
      // Remove our handler from stack
      const index = win._modalCloseStack.indexOf(handler);
      if (index !== -1) {
        win._modalCloseStack.splice(index, 1);
      }

      // If closed manually (not via popstate/back button),
      // the hash will still be `#modal-X`.
      // We go back in history to remove the hash.
      const currentHash = window.location.hash;
      const expectedHash = `#modal-${registeredModalCount}`;
      if (currentHash === expectedHash) {
        window.history.back();
      }
    };
  }, [isOpen]);
}


