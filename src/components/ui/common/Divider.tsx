export function Divider({ text, className = '' }: { text?: string; className?: string }) {
  if (text) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-medical-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-medical-500">{text}</span>
        </div>
      </div>
    );
  }

  return <div className={`border-t border-medical-200 ${className}`} />;
}
