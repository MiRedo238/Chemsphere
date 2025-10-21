import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const Autocomplete = ({ 
  value, 
  onChange, 
  suggestions = [], 
  placeholder = "Search...", 
  onSelect, 
  field,
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (value && suggestions.length > 0) {
      const filtered = suggestions.filter(item => {
        const itemValue = item[field] || '';
        return itemValue.toLowerCase().includes(value.toLowerCase());
      });
      setFilteredSuggestions(filtered.slice(0, 10));
    } else {
      setFilteredSuggestions(suggestions.slice(0, 10));
    }
  }, [value, suggestions, field]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    onChange(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleSuggestionClick = (item) => {
    const itemValue = item[field] || '';
    onChange(itemValue);
    if (onSelect) {
      onSelect(item);
    }
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="autocomplete-container" ref={containerRef}>
      <div className="search-container">
        <Search className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="search-input"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <ChevronDown 
          className={`chevron-icon ${isOpen ? 'rotate-180' : ''}`} 
          size={16} 
        />
      </div>
      
      {isOpen && filteredSuggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {filteredSuggestions.map((item, index) => (
            <div 
              key={index} 
              className="autocomplete-item"
              onClick={() => handleSuggestionClick(item)}
            >
              {item[field]}
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .autocomplete-container {
          position: relative;
          width: 100%;
        }
        
        .search-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .search-input {
          width: 100%;
          padding: 10px 40px 10px 35px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s;
        }
        
        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .search-input:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .search-icon {
          position: absolute;
          left: 10px;
          color: #6b7280;
          width: 16px;
          height: 16px;
          z-index: 10;
        }
        
        .chevron-icon {
          position: absolute;
          right: 10px;
          color: #6b7280;
          transition: transform 0.2s;
        }
        
        .rotate-180 {
          transform: rotate(180deg);
        }
        
        .autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          max-height: 200px;
          overflow-y: auto;
          z-index: 50;
          margin-top: 2px;
        }
        
        .autocomplete-item {
          padding: 10px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .autocomplete-item:hover {
          background-color: #f3f4f6;
        }
        
        .autocomplete-item:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
};

export default Autocomplete;
