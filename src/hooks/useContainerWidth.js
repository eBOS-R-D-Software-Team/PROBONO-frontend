import { useEffect, useState } from "react";
export default function useContainerWidth(ref, fallback = 640) {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const update = () => { if (ref.current) setW(ref.current.clientWidth || fallback); };
    update();
    const ro = new ResizeObserver(update);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref, fallback]);
  return w;
}
