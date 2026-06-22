import { useEffect, useRef } from "react";
import p5 from "p5";
import { createPoemSketch, type PoemSketchOptions } from "../lib/poemSketch";

type Props = PoemSketchOptions;

export function PoemCanvas(props: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const instance = new p5(createPoemSketch(props), container);
    return () => instance.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.words, props.mood, props.color, props.elemental]);

  return <div ref={containerRef} />;
}
