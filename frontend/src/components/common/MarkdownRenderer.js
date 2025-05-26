import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import './MarkdownRenderer.css';

const MarkdownRenderer = ({ content, className = '' }) => {
  return (
    <div className={`markdown-renderer ${className}`}>
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom link component - opens in new tab
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          // Custom code block component with syntax highlighting
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                children={String(children).replace(/\n$/, '')}
                style={tomorrow}
                language={match[1]}
                PreTag="div"
                {...props}
              />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Disable images for security
          img: () => null,
        }}
        // Disable HTML to prevent XSS
        disallowedElements={['script', 'iframe', 'object', 'embed']}
      />
    </div>
  );
};

export default MarkdownRenderer;