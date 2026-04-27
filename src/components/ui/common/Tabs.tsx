interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-medical-100 rounded-xl">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            activeTab === tab.id
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-medical-600 hover:text-text-primary'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`px-1.5 py-0.5 rounded text-xs ${activeTab === tab.id ? 'bg-primary-50 text-primary' : 'bg-medical-200 text-medical-600'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
