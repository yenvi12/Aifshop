export interface SizeOption {
  name: string;
  stock: number;
}

/**
 * Normalize raw sizes input into a clean array of SizeOption.
 * - Trim name
 * - Coerce stock to integer
 * - Ensure stock >= 0
 * - Filter out invalid entries
 */
export function normalizeSizes(raw: any): SizeOption[] {
  if (!raw) return [];

  const arr = Array.isArray(raw) ? raw : [];

  return arr
    .map((item) => {
      const name =
        typeof item?.name === "string"
          ? item.name.trim()
          : "";
      const stockNum = Number(item?.stock);
      const stock =
        Number.isFinite(stockNum) && stockNum > 0
          ? Math.floor(stockNum)
          : 0;

      return { name, stock };
    })
    .filter((s) => s.name !== "" && s.stock >= 0);
}

/**
 * Calculate total stock from a list of sizes.
 */
export function calculateTotalStock(sizes: SizeOption[]): number {
  if (!sizes || sizes.length === 0) return 0;
  return sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
}

/**
 * Decide if a product (by its sizes value) should be treated as "has sizes".
 * A product is considered "has sizes" if there is at least one valid size after normalization.
 */
export function hasSizes(raw: any): boolean {
  return normalizeSizes(raw).length > 0;
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface StockOperationResult {
  success: boolean;
  error?: string;
  newStock?: number;
}

export interface StockValidationResult {
  available: boolean;
  currentStock: number;
  error?: string;
}

export async function validateStockAvailability(
  productId: string,
  quantity: number,
  selectedSize?: string | null
): Promise<StockValidationResult> {
  if (!quantity || quantity <= 0) {
    return {
      available: false,
      currentStock: 0,
      error: "Quantity must be greater than 0",
    };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return {
      available: false,
      currentStock: 0,
      error: "Product not found",
    };
  }

  const productHasSizes = hasSizes(product.sizes);

  if (productHasSizes) {
    if (!selectedSize) {
      return {
        available: false,
        currentStock: 0,
        error: "Size must be specified for this product",
      };
    }

    const sizes = normalizeSizes(product.sizes);
    const sizeOption = sizes.find((s) => s.name === selectedSize);

    if (!sizeOption) {
      return {
        available: false,
        currentStock: 0,
        error: `Size '${selectedSize}' not found for this product`,
      };
    }

    if (sizeOption.stock < quantity) {
      return {
        available: false,
        currentStock: sizeOption.stock,
        error: `Insufficient stock for size '${selectedSize}'. Available: ${sizeOption.stock}, Required: ${quantity}`,
      };
    }

    return {
      available: true,
      currentStock: sizeOption.stock,
    };
  } else {
    if (product.stock < quantity) {
      return {
        available: false,
        currentStock: product.stock,
        error: `Insufficient stock. Available: ${product.stock}, Required: ${quantity}`,
      };
    }

    return {
      available: true,
      currentStock: product.stock,
    };
  }
}

export async function deductStock(
  productId: string,
  quantity: number,
  selectedSize?: string | null
): Promise<StockOperationResult> {
  if (!quantity || quantity <= 0) {
    return {
      success: false,
      error: "Quantity must be greater than 0",
    };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return {
      success: false,
      error: "Product not found",
    };
  }

  const productHasSizes = hasSizes(product.sizes);

  if (productHasSizes) {
    if (!selectedSize) {
      return {
        success: false,
        error: "Size must be specified for this product",
      };
    }

    const sizes = normalizeSizes(product.sizes);
    const sizeIndex = sizes.findIndex((s) => s.name === selectedSize);

    if (sizeIndex === -1) {
      return {
        success: false,
        error: `Size '${selectedSize}' not found for this product`,
      };
    }

    if (sizes[sizeIndex].stock < quantity) {
      return {
        success: false,
        error: `Insufficient stock for size '${selectedSize}'. Available: ${sizes[sizeIndex].stock}, Required: ${quantity}`,
      };
    }

    sizes[sizeIndex].stock -= quantity;
    const newTotalStock = calculateTotalStock(sizes);

    await prisma.product.update({
      where: { id: productId },
      data: {
        sizes: sizes as any,
        stock: newTotalStock,
      },
    });

    return {
      success: true,
      newStock: sizes[sizeIndex].stock,
    };
  } else {
    if (product.stock < quantity) {
      return {
        success: false,
        error: `Insufficient stock. Available: ${product.stock}, Required: ${quantity}`,
      };
    }

    const newStock = product.stock - quantity;

    await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    return {
      success: true,
      newStock: newStock,
    };
  }
}

export async function restoreStock(
  productId: string,
  quantity: number,
  selectedSize?: string | null
): Promise<StockOperationResult> {
  if (!quantity || quantity <= 0) {
    return {
      success: false,
      error: "Quantity must be greater than 0",
    };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return {
      success: false,
      error: "Product not found",
    };
  }

  const productHasSizes = hasSizes(product.sizes);

  if (productHasSizes) {
    if (!selectedSize) {
      return {
        success: false,
        error: "Size must be specified for this product",
      };
    }

    const sizes = normalizeSizes(product.sizes);
    const sizeIndex = sizes.findIndex((s) => s.name === selectedSize);

    if (sizeIndex === -1) {
      return {
        success: false,
        error: `Size '${selectedSize}' not found for this product`,
      };
    }

    sizes[sizeIndex].stock += quantity;
    const newTotalStock = calculateTotalStock(sizes);

    await prisma.product.update({
      where: { id: productId },
      data: {
        sizes: sizes as any,
        stock: newTotalStock,
      },
    });

    return {
      success: true,
      newStock: sizes[sizeIndex].stock,
    };
  } else {
    const newStock = product.stock + quantity;

    await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    });

    return {
      success: true,
      newStock: newStock,
    };
  }
}