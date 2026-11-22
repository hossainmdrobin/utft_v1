'use client';

import React, { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  availableModels?: string[];
  triggerClassName?: string;
  compact?: boolean;
}

function getModelDisplayName(modelId: string) {
  if (!modelId) return 'Select Model';
  const parts = modelId.split('/');
  const name = parts[parts.length - 1];
  const provider = parts.length > 1 ? parts[0] : '';
  const formattedName = name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return provider ? `${formattedName} (${provider})` : formattedName;
}

export default function ModelSelector({
  selectedModel,
  onSelectModel,
  availableModels = [],
  triggerClassName,
  compact = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const models = useMemo(() => {
    if (availableModels.length > 0) {
      return selectedModel && !availableModels.includes(selectedModel)
        ? [selectedModel, ...availableModels]
        : availableModels;
    }
    return selectedModel ? [selectedModel] : ['gh/gpt-5.4-nano'];
  }, [availableModels, selectedModel]);

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return models;
    const q = searchQuery.toLowerCase().trim();
    return models.filter((m) => {
      const displayName = getModelDisplayName(m).toLowerCase();
      const id = m.toLowerCase();
      return id.includes(q) || displayName.includes(q);
    });
  }, [models, searchQuery]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearchQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex items-center justify-between gap-1.5 rounded-lg border border-border/80 bg-background/80 text-xs font-medium text-foreground transition-colors hover:bg-accent/60 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            compact ? 'h-7 px-2 text-[11px]' : 'h-8.5 min-w-[200px] px-2.5',
            triggerClassName
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles className={cn('text-blue-500 shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
            <span className="truncate">{getModelDisplayName(selectedModel)}</span>
          </div>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align={compact ? 'start' : 'end'}>
        <Command shouldFilter={false} className="max-h-[350px]">
          <CommandInput
            placeholder="Search model (e.g. gpt, gemini)..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-9 text-xs"
          />
          <CommandList className="max-h-[260px] overflow-y-auto">
            {filteredModels.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                No model found matching &quot;{searchQuery}&quot;
              </CommandEmpty>
            ) : (
              <CommandGroup heading={searchQuery ? 'Matching Models' : 'Available Models'}>
                {filteredModels.map((model) => {
                  const isSelected = model === selectedModel;
                  return (
                    <CommandItem
                      key={model}
                      value={model}
                      onSelect={() => {
                        onSelectModel(model);
                        setOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center justify-between gap-2 py-2 px-2.5 text-xs cursor-pointer hover:bg-accent aria-selected:bg-accent"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className={cn('font-medium truncate', isSelected ? 'text-blue-600' : 'text-foreground')}>
                          {getModelDisplayName(model)}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate">{model}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
