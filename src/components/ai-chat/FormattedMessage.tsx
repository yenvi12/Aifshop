"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { MessageParser, ParsedMessage } from '@/lib/ai/messageParser';
import {
  HeaderRenderer,
  ListRenderer,
  TableRenderer,
  ProductRenderer,
  ButtonRenderer,
  TextRenderer
} from './renderers';

interface FormattedMessageProps {
  content: string;
  className?: string;
  onProductClick?: (productId: string) => void;
  onButtonClick?: (buttonText: string, variant: string) => void;
}

export default function FormattedMessage({ 
  content, 
  className = '',
  onProductClick,
  onButtonClick 
}: FormattedMessageProps) {
  // Try to parse with our custom parser first
  const parsed = MessageParser.parse(content);
  const hasCustomElements = parsed.some(item => 
    item.type !== 'text' || 
    (item.type === 'text' && item.children && item.children.length > 0)
  );

  // If we have custom elements, use our renderer
  if (hasCustomElements) {
    return (
      <div className={`formatted-message ${className}`}>
        {parsed.map((item, index) => (
          <MessageRenderer
            key={index}
            item={item}
            onProductClick={onProductClick}
            onButtonClick={onButtonClick}
          />
        ))}
      </div>
    );
  }

  // Fallback to react-markdown for basic markdown
  return (
    <div className={`formatted-message ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children, ...props }) => <HeaderRenderer level={1}>{children}</HeaderRenderer>,
          h2: ({ children, ...props }) => <HeaderRenderer level={2}>{children}</HeaderRenderer>,
          h3: ({ children, ...props }) => <HeaderRenderer level={3}>{children}</HeaderRenderer>,
          ul: ({ children, ...props }) => <ListRenderer type="unordered">{children}</ListRenderer>,
          ol: ({ children, ...props }) => <ListRenderer type="ordered">{children}</ListRenderer>,
          table: ({ children, ...props }) => <TableRenderer>{children}</TableRenderer>,
          thead: ({ children, ...props }) => <thead {...props}>{children}</thead>,
          tbody: ({ children, ...props }) => <tbody {...props}>{children}</tbody>,
          tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
          th: ({ children, ...props }) => <th {...props}>{children}</th>,
          td: ({ children, ...props }) => <td {...props}>{children}</td>,
          p: ({ children, ...props }) => <TextRenderer>{children}</TextRenderer>,
          strong: ({ children, ...props }) => <TextRenderer strong>{children}</TextRenderer>,
          em: ({ children, ...props }) => <TextRenderer italic>{children}</TextRenderer>,
          code: ({ className, children, ...props }) => {
            const isInline = !className?.includes('language-');
            return (
              <TextRenderer code={!isInline}>
                {children}
              </TextRenderer>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface MessageRendererProps {
  item: ParsedMessage;
  onProductClick?: (productId: string) => void;
  onButtonClick?: (buttonText: string, variant: string) => void;
}

function MessageRenderer({ item, onProductClick, onButtonClick }: MessageRendererProps) {
  switch (item.type) {
    case 'header':
      return (
        <HeaderRenderer level={Math.min(Math.max((item.props?.level as number) || 1, 1), 3) as 1 | 2 | 3}>
          {item.content}
        </HeaderRenderer>
      );
    
    case 'list':
      return (
        <ListRenderer type={(item.props?.type as string) === 'ordered' ? 'ordered' : 'unordered'}>
          {(item.props?.items as string[])?.map((listItem: string, index: number) => (
            <li key={index}>{listItem}</li>
          ))}
        </ListRenderer>
      );

    case 'table':
      return (
        <TableRenderer headers={item.props?.headers as string[]} rows={item.props?.rows as string[][]} />
      );

    case 'product':
      return (
        <ProductRenderer
          productId={item.props?.productId as string}
          onClick={onProductClick}
        />
      );

    case 'button':
      return (
        <ButtonRenderer
          text={item.content}
          variant={(item.props?.variant as string) === 'primary' ? 'primary' : (item.props?.variant as string) === 'secondary' ? 'secondary' : (item.props?.variant as string) === 'outline' ? 'outline' : (item.props?.variant as string) === 'ghost' ? 'ghost' : 'primary'}
          onClick={onButtonClick}
        />
      );

    case 'emphasis':
      return (
        <TextRenderer strong={item.props?.strong as boolean} italic={item.props?.italic as boolean}>
          {item.content}
        </TextRenderer>
      );
    
    case 'code':
      return (
        <TextRenderer code>
          {item.content}
        </TextRenderer>
      );
    
    case 'text':
    default:
      return (
        <TextRenderer>
          {item.content}
        </TextRenderer>
      );
  }
}