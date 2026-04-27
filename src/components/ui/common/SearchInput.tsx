interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export function SearchInput({ onClear, className = '', ...props }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-medical-400">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        className="w-full pl-11 pr-10 py-2.5"
        {...props}
      />
      {props.value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-medical-400 hover:text-medical-600 p-1 rounded-md hover:bg-medical-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
