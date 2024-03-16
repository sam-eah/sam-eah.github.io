---
title: 'React Auto Scrolling Hook'
description: ''
pubDate: 'Jul 27 2023'
heroImage: '/react.JPG'
---

A simple way to implement auto scrolling in a react component, with the ability to auto pause the scroll, and resume it (twich like).

`utils/scrollUtils.js`

```js
/**
 * Returns true if HTMLElement is scrolled all the way down
 * @param el {HTMLElement | null} HTMLElement
 * @returns {boolean} boolean
 */
export const isAtBottom = (el) =>
  el?.scrollHeight !== (el?.scrollTop || 0) + (el?.clientHeight || 0);

/**
 * Scrolls to bottom of HTMLElement
 * @param el {HTMLElement | null} HTMLElement
 * @returns {void} void
 */
export const scrollToBottom = (el) => {
  /** @type{HTMLElement} */ (el?.lastChild)?.scrollIntoView();
};
```

`hooks/useAutoScroll.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import { isAtBottom, scrollToBottom } from "../utils/scrollUtils";

interface Props {
  listeners: React.DependencyList;
  scrollOnMount: boolean
}

export const useAutoScroll = ({ listeners, scrollOnMount }: Props) => {
  const [isScrolling, setIsScrolling] = useState(scrollOnMount);
  const ref = useRef<HTMLDivElement>(null);

  const validateScroll = () => {
    const _isAtBottom = isAtBottom(ref.current);
    setIsScrolling(!_isAtBottom);
  };

  useEffect(() => {
    if (isScrolling) {
      scrollToBottom(ref.current)
    }
  }, [isScrolling, ...listeners]);

  return {
    ref,
    isScrolling,
    resumeScroll: () => setIsScrolling(true),
    validateScroll
  }
};
```

`components/Chat.tsx`

```tsx
import { Message } from "./Message";
import { MessageResumeBtn } from "./MessageResumeBtn";
import { MessageForm } from "./MessageForm";
import { useStore } from "@nanostores/react";
import { $messages } from "../stores/messages";
import { useAutoScroll } from "../hooks/useAutoScroll";

export function Chat(): JSX.Element {
  const messages = useStore($messages);

  const { ref, isScrolling, resumeScroll, validateScroll } = useAutoScroll({
    listeners: [messages],
    scrollOnMount: true
  });

  return (
    <div className="flex flex-1 flex-col overflow-auto  ">
      <div className="relative flex flex-1 flex-col overflow-auto  ">
        <div
          ref={ref}
          onScroll={validateScroll}
          className="h-full flex-1 overflow-auto border-t border-gray-500"
        >
          <p className="px-4 py-2 text-sm">Welcome to the Chat!</p>
          {messages.map((message) => (
            <Message
              message={message}
              key={message.id}
            />
          ))}
        </div>
        {!isScrolling && (
          <MessageResumeBtn
            onClick={() => {
              resumeScroll();
            }}
          />
        )}
      </div>
      <MessageForm />
    </div>
  );
}
```