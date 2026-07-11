"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Some models emit LaTeX with \[...\] / \(...\) delimiters instead of
// $$...$$ / $...$. Markdown treats \[ as an escaped [, so remark-math never
// sees the math. Normalize before parsing.
function normalizeMath(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, expr) => `\n$$\n${expr.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, expr) => `$${expr.trim()}$`);
}

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];
const mdComponents = {
  a: ({ node: _n, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) => (
    <a {...props} target="_blank" rel="noreferrer" />
  ),
};

function MarkdownImpl({ children }: { children: string }) {
  const content = useMemo(() => normalizeMath(children), [children]);
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={mdComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownImpl);
