import React from "react";

type Severity = "primary" | "secondary" | "success" | "warning" | "danger" | "info";
type Size = "small" | "normal" | "large";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  severity?: Severity;
  variant?: "solid" | "outlined" | "text"; // PrimeReact uses boolean props, but a variant is cleaner in TS
  outlined?: boolean; // Added for PrimeReact parity
  text?: boolean;     // Added for PrimeReact parity
  size?: Size;
  rounded?: boolean;
  icon?: string;
  iconPos?: "left" | "right";
  loading?: boolean;
}

export function Button({
  severity = "primary",
  variant = "solid",
  outlined = false,
  text = false,
  size = "normal",
  rounded = false,
  icon,
  iconPos = "left",
  loading = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {

  // 1. Determine actual variant based on PrimeReact boolean shortcuts
  let actualVariant = variant;
  if (outlined) actualVariant = "outlined";
  if (text) actualVariant = "text";

  // 2. Base styles (layout, transitions, disabled state)
  const baseStyles = "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";

  // 3. Size styles
  const sizeStyles = {
    small: "px-3 py-1.5 text-xs",
    normal: "px-4 py-2 text-sm",
    large: "px-6 py-3 text-base",
  };

  // 4. Shape styles
  const shapeStyles = rounded ? "rounded-full" : "rounded-md";

  // 5. Color Theme Matrix (Adapted to your app's dark theme colors)
  const themeStyles: Record<Severity, Record<string, string>> = {
    primary: { // #5ebbff
      solid: "bg-[#5ebbff] text-[#0a0e17] hover:bg-[#4ea8eb] border border-[#5ebbff]",
      outlined: "bg-transparent text-[#5ebbff] border border-[#5ebbff] hover:bg-[#5ebbff]/10",
      text: "bg-transparent text-[#5ebbff] border border-transparent hover:bg-[#5ebbff]/10",
    },
    secondary: { // Dim gray
      solid: "bg-white/10 text-white hover:bg-white/20 border border-white/10",
      outlined: "bg-transparent text-[#a1a1aa] border border-white/20 hover:bg-white/10 hover:text-white",
      text: "bg-transparent text-[#a1a1aa] border border-transparent hover:bg-white/10 hover:text-white",
    },
    success: { // Green (#22c55e)
      solid: "bg-[#22c55e] text-[#0a0e17] hover:bg-[#16a34a] border border-[#22c55e]",
      outlined: "bg-transparent text-[#22c55e] border border-[#22c55e] hover:bg-[#22c55e]/10",
      text: "bg-transparent text-[#22c55e] border border-transparent hover:bg-[#22c55e]/10",
    },
    danger: { // Red (#ff6b6b)
      solid: "bg-[#ff6b6b] text-[#0a0e17] hover:bg-[#fa5252] border border-[#ff6b6b]",
      outlined: "bg-transparent text-[#ff6b6b] border border-[#ff6b6b] hover:bg-[#ff6b6b]/10",
      text: "bg-transparent text-[#ff6b6b] border border-transparent hover:bg-[#ff6b6b]/10",
    },
    warning: { // Amber/Orange (#fbb03b)
      solid: "bg-[#fbb03b] text-[#0a0e17] hover:bg-[#f59e0b] border border-[#fbb03b]",
      outlined: "bg-transparent text-[#fbb03b] border border-[#fbb03b] hover:bg-[#fbb03b]/10",
      text: "bg-transparent text-[#fbb03b] border border-transparent hover:bg-[#fbb03b]/10",
    },
    info: { // Cyan (#00dcff)
      solid: "bg-[#00dcff] text-[#0a0e17] hover:bg-[#00b5d1] border border-[#00dcff]",
      outlined: "bg-transparent text-[#00dcff] border border-[#00dcff] hover:bg-[#00dcff]/10",
      text: "bg-transparent text-[#00dcff] border border-transparent hover:bg-[#00dcff]/10",
    }
  };

  const finalTheme = themeStyles[severity][actualVariant];

  // 6. Handle the Loading State & Icons
  const isActuallyDisabled = disabled || loading;
  const displayIcon = loading ? "pi pi-spinner pi-spin" : icon;

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${shapeStyles} ${finalTheme} ${className}`}
      disabled={isActuallyDisabled}
      {...props}
    >
      {displayIcon && iconPos === "left" && <i className={displayIcon}></i>}

      {/* Only render children wrapper if there is text, prevents weird padding on icon-only buttons */}
      {children && <span>{children}</span>}

      {displayIcon && iconPos === "right" && <i className={displayIcon}></i>}
    </button>
  );
}
