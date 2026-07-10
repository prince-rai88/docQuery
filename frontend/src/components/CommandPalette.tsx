import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsApi } from '../api/documents';
import type { Document } from '../types';

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  path: string;
  group: 'Navigation' | 'Documents';
}

const NAV_ITEMS: PaletteItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', path: '/', group: 'Navigation' },
  { id: 'nav-upload', label: 'Upload', path: '/upload', group: 'Navigation' },
];

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const loadDocuments = useCallback(async () => {
    try {
      const data = await documentsApi.list();
      setDocuments(data);
    } catch {
      setDocuments([]);
    }
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setActiveIndex(0);
    loadDocuments();
  }, [loadDocuments]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => {
          if (prev) return false;
          setQuery('');
          setActiveIndex(0);
          loadDocuments();
          return true;
        });
      }
      if (e.key === 'Escape') close();
    };
    const handleOpenEvent = () => open();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleOpenEvent);
    };
  }, [close, loadDocuments, open]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const docItems: PaletteItem[] = documents.map((doc) => ({
    id: `doc-${doc.id}`,
    label: doc.title,
    sublabel: doc.status,
    path: `/documents/${doc.id}/chat`,
    group: 'Documents' as const,
  }));

  const allItems = [...NAV_ITEMS, ...docItems];
  const filtered = query.trim()
    ? allItems.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  const handleSelect = (item: PaletteItem) => {
    navigate(item.path);
    close();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    }
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const groups = ['Navigation', 'Documents'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-label="Close command palette"
      />
      <div
        className="relative w-full max-w-lg bg-surface-raised border border-border-strong rounded-card shadow-palette animate-palette-in overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <svg className="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search commands and documents…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs text-ink-faint bg-white/5 border border-border rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-muted text-center">No results found</p>
          ) : (
            groups.map((group) => {
              const items = filtered.filter((item) => item.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <p className="px-4 py-2 text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {group}
                  </p>
                  {items.map((item) => {
                    const globalIndex = filtered.indexOf(item);
                    const isActive = globalIndex === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-left text-sm transition-colors duration-150 ${
                          isActive ? 'bg-accent-muted text-ink' : 'text-ink-muted hover:bg-white/5 hover:text-ink'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.sublabel && (
                          <span className="ml-4 text-xs text-ink-faint capitalize shrink-0">{item.sublabel}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-ink-faint">
          <span><kbd className="px-1 py-0.5 bg-white/5 border border-border rounded">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 bg-white/5 border border-border rounded">↵</kbd> select</span>
          <span className="ml-auto"><kbd className="px-1 py-0.5 bg-white/5 border border-border rounded">⌘K</kbd></span>
        </div>
      </div>
    </div>
  );
};
