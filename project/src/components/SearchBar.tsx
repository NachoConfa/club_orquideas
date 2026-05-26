import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSubmit?: (query: string) => void;
  searchQuery: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onSubmit, searchQuery }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.(searchQuery);
  };

  const clearSearch = () => {
    onSearch('');
    onSubmit?.('');
    setIsExpanded(false);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={`flex items-center rounded-full border border-[#EADBC8] bg-white/90 px-4 py-2 shadow-sm transition-all duration-300 focus-within:border-[#7FAF9B] ${
          isExpanded ? 'min-w-[400px]' : 'min-w-[300px]'
        }`}
      >
        <button
          type="submit"
          className="mr-3 flex-shrink-0 text-[#7FAF9B] transition-colors hover:text-[#0f8f61]"
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" />
        </button>
        <input
          type="text"
          placeholder="Buscar plantas, macetas, accesorios..."
          value={searchQuery}
          onChange={(event) => onSearch(event.target.value)}
          onFocus={() => setIsExpanded(true)}
          onBlur={() => setIsExpanded(false)}
          className="flex-1 bg-transparent text-[#2F3A35] outline-none placeholder:text-[#6B756F]/70"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="ml-2 text-[#6B756F] transition-colors hover:text-[#D96C9F]"
            aria-label="Limpiar busqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar;
