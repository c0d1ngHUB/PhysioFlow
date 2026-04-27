interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
          {props.required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <select
        className={`w-full ${error ? 'border-error focus:border-error focus:ring-error-100' : ''}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}
