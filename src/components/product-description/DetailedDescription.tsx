"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

interface DetailedDescriptionProps {
  description?: string;
  className?: string;
}

export default function DetailedDescription({
  description,
  className = "",
}: DetailedDescriptionProps) {
  if (!description) {
    return null;
  }

  return (
    <section className={`space-y-6 ${className}`}>
      <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mb-6">
        Mô tả chi tiết
      </h2>

      <div
        className={`
          prose prose-lg max-w-none
          prose-headings:font-semibold prose-headings:text-brand-dark
          prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-6
          prose-ul:list-none prose-ul:space-y-3 prose-ul:mb-6
          prose-ol:space-y-3 prose-ol:mb-6
          prose-li:text-gray-700 prose-li:leading-relaxed
          prose-strong:text-brand-dark prose-strong:font-semibold
          prose-a:text-brand-primary prose-a:no-underline 
          prose-a:hover:text-brand-secondary prose-a:underline
          prose-code:text-brand-primary prose-code:bg-gray-100 
          prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          ${className}
        `}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{
            // Custom styling cho unordered lists - chỉ style, không modify structure
            ul: ({ children, ...props }) => (
              <ul className="list-none space-y-3 mb-6" {...props}>
                {children}
              </ul>
            ),
            // Custom styling cho ordered lists
            ol: ({ children, ...props }) => (
              <ol className="list-decimal list-inside space-y-3 mb-6 pl-4" {...props}>
                {children}
              </ol>
            ),
            // Custom styling cho list items
            // Thêm icon cho unordered lists, style marker cho ordered lists
            li: ({ children, node, ...props }) => {
              // Kiểm tra parent node để xác định nằm trong ul hay ol
              const parent = node?.parent;
              const isInUnorderedList = parent?.type === 'element' && parent?.tagName === 'ul';
              
              if (isInUnorderedList) {
                // Unordered list: thêm icon ✓
                return (
                  <li className="flex items-start gap-3 text-gray-700 leading-relaxed" {...props}>
                    <span className="text-brand-primary mt-1.5 flex-shrink-0">
                      ✓
                    </span>
                    <span className="flex-1">{children}</span>
                  </li>
                );
              }
              
              // Ordered list hoặc fallback: style với marker
              return (
                <li className="text-gray-700 leading-relaxed marker:text-brand-primary marker:font-semibold" {...props}>
                  {children}
                </li>
              );
            },
            // Custom styling cho paragraphs
            p: ({ children }) => (
              <p className="text-base md:text-lg text-gray-700 leading-relaxed mb-6 whitespace-pre-line">
                {children}
              </p>
            ),
            // Custom styling cho tables
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full border-collapse border border-gray-200 rounded-xl overflow-hidden shadow-sm" {...props}>
                  {children}
                </table>
              </div>
            ),
            thead: ({ children, ...props }) => (
              <thead className="bg-brand-light" {...props}>
                {children}
              </thead>
            ),
            tbody: ({ children, ...props }) => (
              <tbody className="bg-white divide-y divide-gray-200" {...props}>
                {children}
              </tbody>
            ),
            tr: ({ children, ...props }) => (
              <tr className="hover:bg-brand-soft/50 transition-colors duration-150" {...props}>
                {children}
              </tr>
            ),
            th: ({ children, ...props }) => (
              <th className="px-6 py-4 text-left text-sm font-semibold text-brand-dark border-b border-gray-200" {...props}>
                {children}
              </th>
            ),
            td: ({ children, ...props }) => (
              <td className="px-6 py-4 text-sm text-gray-700 border-b border-gray-100" {...props}>
                {children}
              </td>
            ),
            // Custom styling cho horizontal rules
            hr: ({ ...props }) => (
              <hr className="my-8 border-gray-300" {...props} />
            ),
            // Custom styling cho headings
            h1: ({ children, ...props }) => (
              <h1 className="text-3xl md:text-4xl font-bold text-brand-dark mt-10 mb-6" {...props}>
                {children}
              </h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 className="text-2xl md:text-3xl font-bold text-brand-dark mt-8 mb-4" {...props}>
                {children}
              </h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 className="text-xl md:text-2xl font-semibold text-brand-dark mt-6 mb-3" {...props}>
                {children}
              </h3>
            ),
            h4: ({ children, ...props }) => (
              <h4 className="text-lg md:text-xl font-semibold text-brand-dark mt-5 mb-2" {...props}>
                {children}
              </h4>
            ),
            h5: ({ children, ...props }) => (
              <h5 className="text-base md:text-lg font-semibold text-brand-dark mt-4 mb-2" {...props}>
                {children}
              </h5>
            ),
            h6: ({ children, ...props }) => (
              <h6 className="text-sm md:text-base font-semibold text-brand-dark mt-4 mb-2" {...props}>
                {children}
              </h6>
            ),
            // Custom styling cho blockquotes
            blockquote: ({ children, ...props }) => (
              <blockquote className="border-l-4 border-brand-primary pl-6 py-2 my-6 italic text-gray-600 bg-brand-soft/30 rounded-r-lg" {...props}>
                {children}
              </blockquote>
            ),
            // Custom styling cho code blocks
            code: ({ children, className, ...props }) => {
              const isInline = !className?.includes('language-');
              
              if (isInline) {
                return (
                  <code className="bg-gray-100 text-brand-primary px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                );
              }
              
              return (
                <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-6" {...props}>
                  {children}
                </code>
              );
            },
            // Custom styling cho pre (code blocks wrapper)
            pre: ({ children, ...props }) => (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-6" {...props}>
                {children}
              </pre>
            ),
            // Custom styling cho images
            img: ({ src, alt, ...props }) => (
              <div className="my-6">
                <img 
                  src={src} 
                  alt={alt} 
                  className="max-w-full h-auto rounded-xl shadow-md mx-auto"
                  {...props}
                />
              </div>
            ),
            // Custom styling cho links
            a: ({ href, children, ...props }) => (
              <a 
                href={href} 
                className="text-brand-primary hover:text-brand-secondary underline transition-colors duration-200" 
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            ),
            // Custom styling cho emphasis
            em: ({ children, ...props }) => (
              <em className="italic text-gray-700" {...props}>
                {children}
              </em>
            ),
            // Custom styling cho strong
            strong: ({ children, ...props }) => (
              <strong className="font-semibold text-brand-dark" {...props}>
                {children}
              </strong>
            ),
          }}
        >
          {description}
        </ReactMarkdown>
      </div>
    </section>
  );
}

