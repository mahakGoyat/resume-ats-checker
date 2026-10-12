import { useEffect, useState } from 'react';

const SAVED_EVENT = 'smr:admin-saved';

export function notifySaved() {
  window.dispatchEvent(new CustomEvent(SAVED_EVENT));
}

export function useSavedNotice(): { show: boolean; dismiss: () => void } {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener(SAVED_EVENT, handler);
    return () => window.removeEventListener(SAVED_EVENT, handler);
  }, []);
  return { show, dismiss: () => setShow(false) };
}