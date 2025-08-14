import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  searchQuery: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, searchQuery }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const clearSearch = () => {
    onSearch('');
    setIsExpanded(false);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={`flex items-center bg-white rounded-full px-4 py-2 shadow-md transition-all duration-300 ${
        isExpanded ? 'min-w-[400px]' : 'min-w-[300px]'
      }`}>
        <Search className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
        <input
          type="text"
          placeholder="Buscar orquídeas, macetas, accesorios..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onBlur={() => setIsExpanded(false)}
          className="flex-1 outline-none text-gray-700 placeholder-gray-400"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
};

export default SearchBar;