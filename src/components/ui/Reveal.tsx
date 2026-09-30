"use client";

import { type HTMLMotionProps } from "motion/react";
import * as m from "motion/react-m";

type RevealTag = "div" | "p" | "h1";

type RevealProps = { as?: RevealTag } & Pick<
  HTMLMotionProps<"div">,
  "initial" | "animate" | "whileInView" | "viewport" | "transition" | "className" | "children" | "id"
>;

/**
 * The only client piece a mostly static section needs for its entrance animation.
 * Server Components render their content as `children` and pass plain-object
 * animation props, so the section itself (and its data and icons) stays on the server.
 */
export function Reveal({ as = "div", ...props }: RevealProps) {
  const Component = m[as] as typeof m.div;
  return <Component {...props} />;
}
