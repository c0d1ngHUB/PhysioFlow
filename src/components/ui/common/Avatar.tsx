interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
  ];

  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;

  return (
    <div className={`${sizes[size]} ${colors[colorIndex]} rounded-xl font-semibold flex items-center justify-center flex-shrink-0 ${className}`}>
      {initials}
    </div>
  );
}
