export interface ParsedMessage {
  type: 'text' | 'header' | 'list' | 'table' | 'product' | 'button' | 'link' | 'emphasis' | 'code';
  content: string;
  props?: Record<string, unknown>;
  children?: ParsedMessage[];
}

export class MessageParser {
  static parse(message: string): ParsedMessage[] {
    if (!message || typeof message !== 'string') {
      return [{ type: 'text', content: message || '' }];
    }

    // Split by lines for better parsing
    const lines = message.split('\n');
    const parsed: ParsedMessage[] = [];
    
    let currentTable: string[] = [];
    let inTable = false;
    let currentList: string[] = [];
    let inList = false;
    let listType: 'ordered' | 'unordered' = 'unordered';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        if (inTable) {
          parsed.push(this.parseTable(currentTable));
          currentTable = [];
          inTable = false;
        }
        if (inList) {
          parsed.push(this.parseList(currentList, listType));
          currentList = [];
          inList = false;
        }
        continue;
      }

      // Headers (# ## ###)
      if (line.startsWith('#')) {
        if (inTable) {
          parsed.push(this.parseTable(currentTable));
          currentTable = [];
          inTable = false;
        }
        if (inList) {
          parsed.push(this.parseList(currentList, listType));
          currentList = [];
          inList = false;
        }
        
        const level = line.match(/^#+/)?.[0].length || 1;
        const content = line.replace(/^#+\s*/, '');
        parsed.push({
          type: 'header',
          content,
          props: { level: Math.min(level, 3) }
        });
        continue;
      }

      // Tables (| col1 | col2 |)
      if (line.includes('|') && line.split('|').length >= 3) {
        if (inList) {
          parsed.push(this.parseList(currentList, listType));
          currentList = [];
          inList = false;
        }
        
        currentTable.push(line);
        inTable = true;
        continue;
      }

      // Lists (* item or 1. item)
      if (line.match(/^[\*\-\+]\s/) || line.match(/^\d+\.\s/)) {
        if (inTable) {
          parsed.push(this.parseTable(currentTable));
          currentTable = [];
          inTable = false;
        }
        
        const isOrdered = line.match(/^\d+\.\s/);
        if (inList && listType !== (isOrdered ? 'ordered' : 'unordered')) {
          parsed.push(this.parseList(currentList, listType));
          currentList = [];
        }
        
        listType = isOrdered ? 'ordered' : 'unordered';
        currentList.push(line.replace(/^[\*\-\+]\s|^\d+\.\s/, ''));
        inList = true;
        continue;
      }

      // Product references [product:123]
      const productMatch = line.match(/\[product:(\w+)\]/);
      if (productMatch) {
        if (inTable) {
          parsed.push(this.parseTable(currentTable));
          currentTable = [];
          inTable = false;
        }
        if (inList) {
          parsed.push(this.parseList(currentList, listType));
          currentList = [];
          inList = false;
        }
        
        parsed.push({
          type: 'product',
          content: productMatch[1],
          props: { productId: productMatch[1] }
        });
        continue;
      }

      // Action buttons [button:primary:text]
      const buttonMatch = line.match(/\[button:(\w+):([^]]+)\]/);
      if (buttonMatch) {
        if (inTable) {
          parsed.push(this.parseTable(currentTable));
          currentTable = [];
          inTable = false;
        }
        if (inList) {
          parsed.push(this.parseList(currentList, listType));
          currentList = [];
          inList = false;
        }
        
        parsed.push({
          type: 'button',
          content: buttonMatch[2],
          props: { variant: buttonMatch[1] }
        });
        continue;
      }

      // Close any open structures
      if (inTable) {
        parsed.push(this.parseTable(currentTable));
        currentTable = [];
        inTable = false;
      }
      if (inList) {
        parsed.push(this.parseList(currentList, listType));
        currentList = [];
        inList = false;
      }

      // Regular text with inline formatting
      parsed.push(...this.parseInlineFormatting(line));
    }

    // Handle any remaining open structures
    if (inTable && currentTable.length > 0) {
      parsed.push(this.parseTable(currentTable));
    }
    if (inList && currentList.length > 0) {
      parsed.push(this.parseList(currentList, listType));
    }

    return parsed;
  }

  private static parseInlineFormatting(text: string): ParsedMessage[] {
    const parts: ParsedMessage[] = [];
    
    // Bold text **text**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText.trim()) {
          parts.push({ type: 'text', content: beforeText });
        }
      }
      
      // Add bold text
      parts.push({
        type: 'emphasis',
        content: match[1],
        props: { strong: true }
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText.trim()) {
        parts.push({ type: 'text', content: remainingText });
      }
    }
    
    // If no bold formatting found, return as simple text
    if (parts.length === 0) {
      parts.push({ type: 'text', content: text });
    }
    
    return parts;
  }

  private static parseTable(rows: string[]): ParsedMessage {
    const headers = rows[0].split('|').map(cell => cell.trim()).filter(cell => cell);
    const data = rows.slice(1).map(row => 
      row.split('|').map(cell => cell.trim()).filter(cell => cell)
    );
    
    return {
      type: 'table',
      content: '',
      props: { headers, rows: data }
    };
  }

  private static parseList(items: string[], type: 'ordered' | 'unordered'): ParsedMessage {
    return {
      type: 'list',
      content: '',
      props: { type, items }
    };
  }

  // Parse product references from AI responses
  static parseProductReferences(text: string): string[] {
    const productRegex = /\[product:(\w+)\]/g;
    const products: string[] = [];
    let match;
    
    while ((match = productRegex.exec(text)) !== null) {
      products.push(match[1]);
    }
    
    return products;
  }

  // Parse action buttons from AI responses
  static parseActionButtons(text: string): Array<{text: string, variant: string}> {
    const buttonRegex = /\[button:(\w+):([^]]+)\]/g;
    const buttons: Array<{text: string, variant: string}> = [];
    let match;
    
    while ((match = buttonRegex.exec(text)) !== null) {
      buttons.push({
        text: match[2],
        variant: match[1]
      });
    }
    
    return buttons;
  }

  // Clean text by removing special syntax
  static cleanText(text: string): string {
    return text
      .replace(/\[product:\w+\]/g, '')
      .replace(/\[button:\w+:[^]]+\]/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .trim();
  }
}