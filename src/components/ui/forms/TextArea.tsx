interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className = '', ...props }: TextAreaProps) {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
          {props.required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      <textarea
        className={`w-full min-h-[100px] resize-y ${error ? 'border-error focus:border-error focus:ring-error-100' : ''}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
    </div>
  );
}
