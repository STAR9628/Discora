import React from "react";

// Safe URL regex that matches http and https URLs
const URL_REGEX = /(https?:\/\/[^\s<>"'()]+)/g;

interface LinkifyProps {
  text: string;
  className?: string;
}

/**
 * Safely parses text and renders URLs as clickable links.
 * Avoids dangerouslySetInnerHTML to prevent XSS.
 */
export function Linkify({ text, className }: LinkifyProps) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(URL_REGEX)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary hover:underline font-medium break-all underline-offset-2"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}
