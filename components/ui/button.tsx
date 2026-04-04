interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  const base = variant === "primary" ? "btn-primary" : "btn-secondary";
  return (
    <button className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}
