import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSubmit?: (query: string) => void;
  searchQuery: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onSubmit, searchQuery }) => {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.(searchQuery);
  };

  const clearSearch = () => {
    onSearch('');
    onSubmit?.('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative min-w-0 w-full">
      <div
        className="flex min-w-0 w-full items-center rounded-full border border-[#F1E3D4] bg-white px-3 py-2 shadow-sm transition-all duration-300 focus-within:border-[#0F8F61] focus-within:ring-2 focus-within:ring-[#E8F7EF] sm:px-4"
      >
        <button
          type="submit"
          className="mr-3 flex-shrink-0 text-[#0F8F61] transition-colors hover:text-[#0C7A52]"
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" />
        </button>
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchQuery}
          onChange={(event) => onSearch(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#16352B] outline-none placeholder:text-[#6B7280]/70 sm:text-base"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="ml-2 text-[#6B7280] transition-colors hover:text-[#0F8F61]"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar;
