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
  let parsed = MessageParser.parse(content);
  
  // Post-processing: Tìm và parse button syntax trong text items nếu chưa được parse
  // Điều này đảm bảo button syntax được parse ngay cả khi nó không được parse trước đó
  parsed = parsed.map((item) => {
    if (item.type === 'text') {
      const trimmed = item.content.trim();
      // Kiểm tra xem text có chứa button syntax không
      const buttonMatch = trimmed.match(/^\[button:(\w+):([^\]]+)\]$/);
      if (buttonMatch) {
        // Nếu text chỉ chứa button syntax (không có text khác), chuyển thành button item
        return {
          type: 'button' as const,
          content: buttonMatch[2],
          props: { variant: buttonMatch[1] }
        };
      }
    }
    return item;
  });

  // Có custom elements nếu tồn tại ít nhất 1 item KHÔNG phải text,
  // HOẶC là button/product đã parse được.
  const hasCustomElements = parsed.some(item =>
    item.type !== 'text'
  );

  // Nếu có custom elements (product-card, button, header, v.v.), dùng renderer custom
  if (hasCustomElements) {
    // Gom các item liên tiếp để nhận diện block sản phẩm
    // Cho phép button xuất hiện ngay sau product block
    const blocks: ParsedMessage[][] = [];
    let currentBlock: ParsedMessage[] = [];
    let hasProductsInCurrentBlock = false;

    parsed.forEach((item) => {
      const isProductLike =
        item.type === 'product' &&
        item.props &&
        (item.props.productId || (item.props as any).id || (item.props as any).slug);

      if (isProductLike) {
        currentBlock.push(item);
        hasProductsInCurrentBlock = true;
      } else if (item.type === 'button' && hasProductsInCurrentBlock) {
        // Nếu là button và đang có products trong block, thêm vào cùng block
        // Điều này cho phép button "Xem thêm sản phẩm" hiển thị sau danh sách sản phẩm
        currentBlock.push(item);
      } else {
        // Không phải product và không phải button sau product block
        // Kết thúc product block hiện tại (nếu có) và bắt đầu block mới
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
          currentBlock = [];
          hasProductsInCurrentBlock = false;
        }
        blocks.push([item]);
      }
    });

    // Thêm block cuối cùng nếu còn
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    return (
      <div className={`formatted-message ${className}`}>
        {blocks.map((block, blockIndex) => {
          const first = block[0];

          // Nhận diện block order list: ít nhất 1 item order
          const isOrderBlock =
            first.type === 'order' &&
            first.props &&
            ((first.props as any).id || (first.props as any).code);

          if (isOrderBlock) {
            const orders = block
              .filter((item) => item.type === 'order')
              .map((item) => {
                const props = item.props || {};
                const id = (props.id as string) || (props.code as string) || item.content;
                const code = (props.code as string) || id;
                const status = (props.status as string) || '';
                const total =
                  typeof (props.total as number) === 'number' && (props.total as number) > 0
                    ? (props.total as number)
                    : undefined;
                const createdAt = (props.createdAt as string) || '';
                const itemCount =
                  typeof (props.itemCount as number) === 'number' && (props.itemCount as number) > 0
                    ? (props.itemCount as number)
                    : undefined;

                return {
                  id,
                  code,
                  status,
                  total,
                  createdAt,
                  itemCount,
                };
              })
              .filter((o) => o.id && o.code);

            if (!orders.length) {
              return block.map((item, idx) => (
                <MessageRenderer
                  key={`${blockIndex}-${idx}`}
                  item={item}
                  onProductClick={onProductClick}
                  onButtonClick={onButtonClick}
                />
              ));
            }

            const getStatusBadgeClasses = (status: string) => {
              const normalized = status.toUpperCase();
              if (normalized === 'DELIVERED') return 'bg-green-50 text-green-700 border-green-200';
              if (normalized === 'SHIPPED') return 'bg-blue-50 text-blue-700 border-blue-200';
              if (normalized === 'PROCESSING' || normalized === 'CONFIRMED')
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
              if (normalized === 'CANCELLED') return 'bg-red-50 text-red-700 border-red-200';
              return 'bg-gray-50 text-gray-700 border-gray-200';
            };

            return (
              <div
                key={`order-block-${blockIndex}`}
                className="mb-3 flex flex-col gap-1.5"
              >
                {orders.map((o) => {
                  const dateLabel = o.createdAt
                    ? new Date(o.createdAt).toLocaleDateString('vi-VN')
                    : '';
                  const statusLabel = o.status || 'Đang xử lý';

                  return (
                    <a
                      key={o.id}
                      href="/orders"
                      className="group flex w-full items-center gap-3 rounded-2xl bg-white/95 hover:bg-brand-light/70 border border-brand-light px-3.5 py-2.5 transition-colors"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-dark group-hover:text-brand-primary">
                          <span className="truncate">#{o.code}</span>
                          <span className="mx-0.5 text-[9px] text-brand-secondary">•</span>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[8px] font-semibold ${getStatusBadgeClasses(
                              o.status
                            )}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] text-brand-secondary">
                          {dateLabel && <span>{dateLabel}</span>}
                          {typeof o.itemCount === 'number' && (
                            <span>{o.itemCount} sp</span>
                          )}
                          {typeof o.total === 'number' && o.total > 0 && (
                            <span className="font-semibold text-brand-primary">
                              {o.total.toLocaleString('vi-VN')}₫
                            </span>
                          )}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            );
          }

          // Nhận diện block product list: ít nhất 1 item product có props đầy đủ
          const isProductBlock =
            first.type === 'product' &&
            first.props &&
            (first.props.productId || (first.props as any).id || (first.props as any).slug);

          if (isProductBlock) {
            const products = block
              .filter((item) => item.type === 'product')
              .map((item) => {
                const props = item.props || {};
                const price = typeof props.price === 'number' ? (props.price as number) : undefined;
                const compareAt =
                  typeof (props as any).compareAt === 'number'
                    ? ((props as any).compareAt as number)
                    : undefined;
                const rating =
                  typeof props.rating === 'number' ? (props.rating as number) : undefined;
                const reviewCount =
                  typeof (props as any).reviewCount === 'number'
                    ? ((props as any).reviewCount as number)
                    : undefined;

                const id =
                  (props.productId as string) ||
                  (props.id as string) ||
                  (props.slug as string) ||
                  item.content;

                return {
                  id,
                  name: (props.name as string) || item.content,
                  slug: (props.slug as string) || undefined,
                  image: (props.image as string) || (props.thumbnail as string) || undefined,
                  price,
                  compareAtPrice: compareAt,
                  rating,
                  reviewCount,
                  badge: (props.badge as string) || undefined,
                };
              })
              .filter((p) => p.id && p.name)
              .slice(0, 5);

            if (!products.length) {
              // Không parse được -> fallback render từng item
              return block.map((item, idx) => (
                <MessageRenderer
                  key={`${blockIndex}-${idx}`}
                  item={item}
                  onProductClick={onProductClick}
                  onButtonClick={onButtonClick}
                />
              ));
            }

            // Tìm buttons trong block
            const buttons = block.filter((item) => item.type === 'button');

            // Vertical list: mỗi item full-width, click cả dòng để navigate
            return (
              <div
                key={`product-block-${blockIndex}`}
                className="mb-2 flex flex-col gap-1"
              >
                {products.map((p) => {
                  const href = p.slug ? `/products/${p.slug}` : '#';
                  return (
                    <a
                      key={p.id}
                      href={href}
                      className="group flex w-full items-center gap-3 rounded-xl bg-white/95 hover:bg-brand-light/60 border border-brand-light px-3 py-2 transition-colors"
                    >
                      {/* Ảnh */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-brand-light flex-shrink-0">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-brand-secondary">
                            SP
                          </div>
                        )}
                      </div>

                      {/* Nội dung */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-brand-dark line-clamp-2 group-hover:text-brand-primary">
                          {p.name}
                        </div>

                        <div className="mt-0.5 flex items-center gap-2">
                          <div className="text-xs font-bold text-brand-primary">
                            {typeof p.price === 'number' && p.price > 0
                              ? `${p.price.toLocaleString('vi-VN')}₫`
                              : 'Liên hệ'}
                          </div>
                          {typeof p.price === 'number' &&
                            p.price > 0 &&
                            typeof p.compareAtPrice === 'number' &&
                            p.compareAtPrice > p.price && (
                              <div className="text-[10px] text-brand-secondary line-through">
                                {p.compareAtPrice.toLocaleString('vi-VN')}₫
                              </div>
                            )}
                        </div>

                        {typeof p.rating === 'number' && (
                          <div className="mt-0.5 text-[10px] text-brand-secondary">
                            ⭐ {p.rating.toFixed(1)}
                            {typeof p.reviewCount === 'number' &&
                              p.reviewCount > 0 &&
                              ` · ${p.reviewCount} đánh giá`}
                          </div>
                        )}
                      </div>
                    </a>
                  );
                })}
                
                {/* Render buttons sau danh sách sản phẩm */}
                {buttons.length > 0 && (
                  <div className="mt-2 flex justify-center">
                    {buttons.map((buttonItem, btnIdx) => (
                      <MessageRenderer
                        key={`button-${blockIndex}-${btnIdx}`}
                        item={buttonItem}
                        onProductClick={onProductClick}
                        onButtonClick={onButtonClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Block thường: render từng item như cũ
          return block.map((item, idx) => (
            <MessageRenderer
              key={`${blockIndex}-${idx}`}
              item={item}
              onProductClick={onProductClick}
              onButtonClick={onButtonClick}
            />
          ));
        })}
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
          variant={
            (item.props?.variant as string) === 'primary'
              ? 'primary'
              : (item.props?.variant as string) === 'secondary'
              ? 'secondary'
              : (item.props?.variant as string) === 'outline'
              ? 'outline'
              : (item.props?.variant as string) === 'ghost'
              ? 'ghost'
              : 'primary'
          }
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
      // Kiểm tra xem text có chứa button syntax không và parse nếu có
      const buttonMatch = item.content.match(/\[button:(\w+):([^\]]+)\]/);
      if (buttonMatch) {
        // Nếu text chỉ chứa button syntax, render như button
        const trimmed = item.content.trim();
        if (trimmed === buttonMatch[0] || trimmed.replace(/\s+/g, '') === buttonMatch[0].replace(/\s+/g, '')) {
          return (
            <ButtonRenderer
              text={buttonMatch[2]}
              variant={
                buttonMatch[1] === 'primary'
                  ? 'primary'
                  : buttonMatch[1] === 'secondary'
                  ? 'secondary'
                  : buttonMatch[1] === 'outline'
                  ? 'outline'
                  : buttonMatch[1] === 'ghost'
                  ? 'ghost'
                  : 'primary'
              }
              onClick={onButtonClick}
            />
          );
        }
        // Nếu text chứa button syntax nhưng không chỉ có button, render text và button riêng
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        const buttonRegex = /\[button:(\w+):([^\]]+)\]/g;
        let match;
        
        while ((match = buttonRegex.exec(item.content)) !== null) {
          // Thêm text trước button
          if (match.index > lastIndex) {
            parts.push(item.content.substring(lastIndex, match.index));
          }
          // Thêm button
          parts.push(
            <ButtonRenderer
              key={`inline-button-${match.index}`}
              text={match[2]}
              variant={
                match[1] === 'primary'
                  ? 'primary'
                  : match[1] === 'secondary'
                  ? 'secondary'
                  : match[1] === 'outline'
                  ? 'outline'
                  : match[1] === 'ghost'
                  ? 'ghost'
                  : 'primary'
              }
              onClick={onButtonClick}
            />
          );
          lastIndex = match.index + match[0].length;
        }
        // Thêm text còn lại
        if (lastIndex < item.content.length) {
          parts.push(item.content.substring(lastIndex));
        }
        
        return (
          <TextRenderer>
            {parts.length > 0 ? parts : item.content}
          </TextRenderer>
        );
      }
      
      return (
        <TextRenderer>
          {item.content}
        </TextRenderer>
      );
  }
}