import { useEffect, useRef } from 'react';

/**
 * Custom hook to register modals to a global handler stack.
 * This intercepts browser/mobile back buttons to close active modals.
 * 
 * The hook ONLY manages the close handler registration.
 * All history manipulation is handled centrally in the popstate listener (page.tsx).
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

    // Register our modal close callback
    win._modalCloseStack.push(handler);

    return () => {
      const index = win._modalCloseStack.indexOf(handler);
      if (index !== -1) {
        win._modalCloseStack.splice(index, 1);
      }
    };
  }, [isOpen]);
}
