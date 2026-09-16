// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
import { MiSkiEditingRenderer, type MiSkiRenderer } from "../../editor/core/MiSkiRenderer";
import { BackendNotSupportedError } from "../../editor/core/errors";
import { type RefObject, useEffect, useRef, useState } from "react";

interface KlassRenderer {
  setup: (canvas: HTMLCanvasElement) => Promise<MiSkiRenderer>;
}

export default function useEditorRenderer(
  KlassRenderer: KlassRenderer,
  canvasRef: RefObject<HTMLCanvasElement | null>,
): { renderer: MiSkiRenderer | null; backendNotSupported: boolean } {
  const rendererRef = useRef<MiSkiRenderer | null>(null);
  const [backendNotSupported, setBackendNotSupported] = useState(false);

  // UseEffect is guaranteed to run after the DOM is painted, but after it runs, we need to render.
  const [, setGeneration] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) {
      console.error("Canvas ref is null");
      return () => {};
    }

    let isMounted = true;

    KlassRenderer.setup(canvasRef.current)
      .then((renderer) => {
        if (!isMounted) {
          // Component was unmounted before setup completed, cleanup immediately
          renderer.stop();
          renderer.unmount();
          return;
        }

        rendererRef.current = renderer;
        rendererRef.current.mount();
        rendererRef.current.start();
        setGeneration((generation) => generation + 1);
      })
      .catch((error) => {
        if (!isMounted) return;
        if (error instanceof BackendNotSupportedError) {
          setBackendNotSupported(true);
        } else {
          throw error;
        }
      });

    setGeneration((generation) => generation + 1);

    return () => {
      isMounted = false;
      // Use a direct reference to ensure cleanup happens
      const renderer = rendererRef.current;
      if (renderer) {
        renderer.stop();
        renderer.unmount();
        rendererRef.current = null;
      }
    };
  }, [KlassRenderer]);

  return { renderer: rendererRef.current, backendNotSupported };
}

export { MiSkiEditingRenderer };
