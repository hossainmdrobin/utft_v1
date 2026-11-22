'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, Sparkles } from 'lucide-react';

interface ChatHeaderProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  availableModels: string[];
}

function getModelDisplayName(modelId: string) {
  if (!modelId) return "Select Model";
  const parts = modelId.split("/");
  const name = parts[parts.length - 1];
  const provider = parts.length > 1 ? parts[0] : "";
  const formattedName = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return provider ? `${formattedName} (${provider})` : formattedName;
}

export default function ChatHeader({
  selectedModel,
  onSelectModel,
  availableModels = [],
}: ChatHeaderProps) {
  const models = availableModels.length > 0
    ? (selectedModel && !availableModels.includes(selectedModel)
        ? [selectedModel, ...availableModels]
        : availableModels)
    : (selectedModel ? [selectedModel] : ["gh/gpt-5.4-nano"]);

  return (
    <div className="flex items-center justify-between border-b bg-card/50 backdrop-blur-sm px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold leading-none text-foreground">AI Assistant</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Select model for generation</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedModel} onValueChange={onSelectModel}>
          <SelectTrigger className="h-8.5 w-[220px] text-xs font-medium border-border/80 bg-background/80 shadow-none">
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <SelectValue placeholder="Select model">
                {getModelDisplayName(selectedModel)}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent align="end">
            {models.map((model) => (
              <SelectItem key={model} value={model} className="text-xs cursor-pointer py-1.5">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{getModelDisplayName(model)}</span>
                  <span className="text-[10px] text-muted-foreground">{model}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
