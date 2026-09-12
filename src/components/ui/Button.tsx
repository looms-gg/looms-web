import type { ButtonHTMLAttributes, ReactNode } from "react"
import { Link, type LinkProps } from "react-router-dom"
import { Icon, type IconSize, type IconType } from "./Icon"

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "ghost"
  | "outline"

export type ButtonSize = "xs" | "sm" | "md" | "lg"

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  accent: "btn-accent",
  info: "btn-info",
  success: "btn-success",
  warning: "btn-warning",
  error: "btn-error",
  neutral: "btn-neutral",
  ghost: "btn-ghost",
  outline: "btn-outline",
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  xs: "btn-xs",
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
}

type Geometry = {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Force pill geometry. Primary/secondary/accent are already pills. */
  pill?: boolean
  block?: boolean
  circle?: boolean
}

/** Build the class list for the shared button system. */
export function buttonClass({
  variant = "ghost",
  size,
  pill = false,
  block = false,
  circle = false,
  className = "",
}: Geometry & { className?: string } = {}) {
  return [
    "btn",
    VARIANT_CLASS[variant],
    size ? SIZE_CLASS[size] : "",
    circle ? "btn-circle" : pill ? "btn-pill" : "",
    block ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")
}

type BaseProps = Geometry & {
  icon?: IconType
  iconSize?: IconSize
  loading?: boolean
  className?: string
  children?: ReactNode
}

export function Button({
  variant,
  size,
  pill,
  block,
  circle,
  icon,
  iconSize = "sm",
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: BaseProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={buttonClass({ variant, size, pill, block, circle, className })}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="loading loading-spinner loading-xs" aria-hidden />
      ) : icon ? (
        <Icon icon={icon} size={iconSize} />
      ) : null}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  pill,
  block,
  circle,
  icon,
  iconSize = "sm",
  className,
  children,
  ...rest
}: BaseProps & LinkProps) {
  return (
    <Link className={buttonClass({ variant, size, pill, block, circle, className })} {...rest}>
      {icon ? <Icon icon={icon} size={iconSize} /> : null}
      {children}
    </Link>
  )
}
