'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import ModelSelector from './ModelSelector';

interface ChatHeaderProps {
  selectedModel: string;
  onSelectModel: (model: string) => void;
  availableModels: string[];
}

export default function ChatHeader({
  selectedModel,
  onSelectModel,
  availableModels = [],
}: ChatHeaderProps) {
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
        <ModelSelector
          selectedModel={selectedModel}
          onSelectModel={onSelectModel}
          availableModels={availableModels}
        />
      </div>
    </div>
  );
}
