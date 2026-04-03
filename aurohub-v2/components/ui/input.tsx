interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
          {label}
        </label>
      )}
      <input className={`input ${className}`} {...props} />
    </div>
  );
}
