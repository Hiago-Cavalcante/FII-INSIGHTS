import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "error" | "warning" | "neutral";

const variantClasses: Record<Variant, { bg: string; circle: string }> = {
  default: {
    bg: "stroke-gray-200 dark:stroke-gray-700",
    circle: "stroke-blue-500",
  },
  success: {
    bg: "stroke-gray-200 dark:stroke-gray-700",
    circle: "stroke-emerald-500",
  },
  error: {
    bg: "stroke-gray-200 dark:stroke-gray-700",
    circle: "stroke-red-500",
  },
  warning: {
    bg: "stroke-gray-200 dark:stroke-gray-700",
    circle: "stroke-amber-500",
  },
  neutral: {
    bg: "stroke-gray-200 dark:stroke-gray-700",
    circle: "stroke-gray-500",
  },
};

interface ProgressCircleProps {
  value?: number;
  max?: number;
  radius?: number;
  strokeWidth?: number;
  variant?: Variant;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressCircle({
  value = 0,
  max = 100,
  radius = 32,
  strokeWidth = 6,
  variant = "default",
  className,
  children,
}: ProgressCircleProps) {
  const safeValue = Math.min(max, Math.max(value, 0));
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (safeValue / max) * circumference;
  const { bg, circle } = variantClasses[variant];

  return (
    <div className="relative" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <svg
        width={radius * 2}
        height={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        className={cn("-rotate-90 transform", className)}
      >
        <circle
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          className={cn("transition-colors ease-linear", bg)}
        />
        <circle
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          fill="transparent"
          strokeLinecap="round"
          className={cn(
            "transition-all duration-500 ease-in-out",
            circle,
          )}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
