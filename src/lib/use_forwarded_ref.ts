import { useRef, useEffect, type MutableRefObject, type Ref } from "react";

export function useForwardedRef<T>(forwardedRef: Ref<T>): MutableRefObject<T | null> {
  const innerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!forwardedRef) return;

    if (typeof forwardedRef === "function") {
      forwardedRef(innerRef.current);
    } else {
      // eslint-disable-next-line no-param-reassign
      (forwardedRef as MutableRefObject<T | null>).current = innerRef.current;
    }
  });

  return innerRef;
} 