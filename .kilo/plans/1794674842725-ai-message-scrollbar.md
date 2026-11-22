# AI Message Scrollbar Plan

## Goal
Add individual scrollbars to AI message bubbles when content overflows the viewport, so long AI responses can be scrolled within their own bubble instead of pushing the entire message list.

## Current Structure
- `ChatWindow.tsx` - Main container with `overflow-hidden`
- `MessageList.tsx` - Has `overflow-y-auto` for entire message list
- `MessageBubble.tsx` - Renders individual messages; AI messages use `prose` + `ReactMarkdown`

## Changes Required

### 1. Modify `MessageBubble.tsx`
Add max-height and overflow to AI message content container:
- Wrap the AI message content (the `prose` div) with a container that has:
  - `max-h-[60vh]` (or similar viewport-relative height)
  - `overflow-y-auto`
  - Custom scrollbar styling for consistency

### 2. Considerations
- Keep user messages unchanged (they're typically short)
- Ensure code blocks, tables, and markdown content remain readable when scrolled
- Test with various content lengths
- Maintain existing Tailwind/shadcn design patterns

## Implementation Steps
1. Edit `src/app/app/chat/MessageBubble.tsx`
2. Add a wrapper div around the AI message content with `max-h-[60vh] overflow-y-auto`
3. Optionally add custom scrollbar styles via Tailwind utilities

## Validation
- Run `npm run lint` and `npx tsc --noEmit`
- Test with long AI responses (code, markdown, plain text)
- Verify user messages unaffected
- Check dark/light mode scrollbar visibility