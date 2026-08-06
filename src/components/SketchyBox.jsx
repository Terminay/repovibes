import React, { useRef, useState, useLayoutEffect } from 'react';
import { rectPaths } from '../lib/rough.js';

// Wraps children with a hand-drawn rough.js rectangle border that tracks the
// element's size. The SVG sits behind the content (pointer-events: none) so
// inputs/buttons stay fully interactive.
export default function SketchyBox({
  color = '#3a3128',
  fill,
  fillStyle = 'hachure',
  fillWeight,
  hachureGap,
  roughness = 1.7,
  strokeWidth = 2.5,
  seed = 1,
  redrawKey = 0,
  className = '',
  contentClassName = '',
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paths =
    size.w > 0
      ? rectPaths(size.w, size.h, {
          stroke: color,
          strokeWidth,
          roughness,
          fill,
          fillStyle,
          fillWeight,
          hachureGap,
          seed: seed + redrawKey,
        })
      : [];

  return (
    <div ref={ref} className={`sketchy-box ${className}`} {...rest}>
      {size.w > 0 && (
        <svg
          className="sketchy-svg"
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          aria-hidden="true"
        >
          {paths.map((p, i) => (
            <path
              key={`${redrawKey}-${i}`}
              className="sketchy-stroke"
              d={p.d}
              stroke={p.stroke}
              strokeWidth={p.strokeWidth}
              fill={p.fill || 'none'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      )}
      <div className={`sketchy-content ${contentClassName}`}>{children}</div>
    </div>
  );
}
