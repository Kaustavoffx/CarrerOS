import React, { type ButtonHTMLAttributes, type ReactNode } from "react";

type MagneticButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  asChild?: boolean;
};

export function MagneticButton({ children, className = "", onPointerMove, onPointerLeave, asChild, ...props }: MagneticButtonProps) {
  if (asChild && React.isValidElement(children)) {
    interface ChildProps {
      onPointerEnter?: React.PointerEventHandler<HTMLElement>;
      onPointerMove?: React.PointerEventHandler<HTMLElement>;
      onPointerLeave?: React.PointerEventHandler<HTMLElement>;
      className?: string;
    }

    const child = children as React.ReactElement<ChildProps>;

    const cloneProps: ChildProps & React.Attributes = {
      onPointerEnter: child.props.onPointerEnter,
      onPointerMove: onPointerMove ?? child.props.onPointerMove,
      onPointerLeave: onPointerLeave ?? child.props.onPointerLeave,
      className: `${child.props.className ?? ""} ${className}`.trim()
    };

    return React.cloneElement(child, cloneProps);
  }

  return (
    <button
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}
