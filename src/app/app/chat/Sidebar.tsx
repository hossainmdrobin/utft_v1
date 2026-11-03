'use client';

import React, { useEffect,useState } from 'react';
import { Menu, Plus, MessageSquare, HelpCircle, History, Settings, LogOut } from 'lucide-react';

export default function Sidebar() {
    const [isSidebarOpen, setSidebarOpen] = useState(true)


  return (
    <>
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-0'
        } flex shrink-0 flex-col overflow-hidden border-r border-line bg-surface transition-[width] duration-300 ease-out max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 ${
          isSidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        }`}
      >
        {/* Header with toggle menu */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-3">
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-gray-400 transition hover:bg-elevated hover:text-ink"
            // onClick={() => dispatch(toggleSidebar())}
            title={isSidebarOpen ? 'Collapse menu' : 'Expand menu'}
          >
            <Menu size={18} />
          </button>
          {isSidebarOpen ? (
            <span className="flex items-center gap-2 pr-1 text-sm font-semibold text-ink">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/15 text-accent">
                <MessageSquare size={14} />
              </span>
              DeepAgent
            </span>
          ) : null}
        </div>

        {/* New Chat Button */}
        <div className="px-3 pb-3">
          <button
            className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-elevated px-3 py-2.5 text-sm font-medium text-ink transition hover:border-accent/50 hover:bg-canvas"
            // onClick={handleNewChat}
          >
            <Plus size={16} className="text-accent" />
            <span className={isSidebarOpen ? '' : 'sr-only'}>New chat</span>
          </button>
        </div>

        {/* Recent Chats History */}
        {/* <ChatHistoryList
          chats={chats}
          activeChatId={threadId}
          isSidebarOpen={isSidebarOpen}
          isLoading={isLoading}
          isDeleting={isDeleting}
          onSelect={handleSelectChat}
          onDelete={handleDeleteChat}
        /> */}


      </aside>

    </>
  );
}
