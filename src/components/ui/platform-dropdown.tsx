'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface PlatformDropdownOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface PlatformDropdownProps {
  value: string;
  options: PlatformDropdownOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
}

export function PlatformDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Select an option',
  searchable = false,
  className,
  compact = false,
  disabled = false,
}: PlatformDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  const choose = (option: PlatformDropdownOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className={`platformDropdown ${compact ? 'platformDropdownCompact' : ''} ${className ?? ''}`}>
      <button
        type="button"
        className="platformDropdownTrigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((index) => Math.max(0, Math.min(visibleOptions.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((isOpen) => !isOpen);
          }
          if (event.key === 'Escape') setOpen(false);
        }}
      >
        <span className={!selected ? 'platformDropdownPlaceholder' : ''}>{selected?.label ?? placeholder}</span>
        <ChevronDown className="platformDropdownChevron" aria-hidden="true" />
      </button>
      {open && (
        <div id={listId} className="platformDropdownMenu" role="listbox" aria-label={ariaLabel}>
          {searchable && (
            <input
              ref={searchRef}
              type="search"
              className="platformDropdownSearch"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search..."
              aria-label={`Search ${ariaLabel.toLowerCase()}`}
            />
          )}
          <div className="platformDropdownOptions">
            {visibleOptions.length === 0 ? (
              <span className="platformDropdownEmpty">No matching options</span>
            ) : visibleOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                className={`platformDropdownOption ${index === activeIndex ? 'platformDropdownOptionActive' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span>
                  <span className="platformDropdownOptionLabel">{option.label}</span>
                  {option.description && <span className="platformDropdownOptionDescription">{option.description}</span>}
                </span>
                {option.value === value && <Check size={15} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
