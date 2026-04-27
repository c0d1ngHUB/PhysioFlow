interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, helpText, icon, className = '', ...props }: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
          {props.required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-medical-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full ${icon ? 'pl-10' : ''} ${error ? 'border-error focus:border-error focus:ring-error-100' : ''}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-error flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </p>}
      {helpText && !error && <p className="mt-1.5 text-sm text-medical-500">{helpText}</p>}
    </div>
  );
}
