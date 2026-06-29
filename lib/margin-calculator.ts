import { Product, Metrics } from './types';

function round(num: number, decimals: number = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function analyzeProducts(productData: unknown[][]): Product[] {
  if (!productData || productData.length === 0) return [];

  const products: Product[] = [];

  for (let i = 1; i < productData.length; i++) {
    const row = productData[i];
    if (!row || !row[0]) continue;

    try {
      const productId = String(row[0] || '');
      const productName = String(row[1] || '');
      const category = String(row[2] || '');
      const cost = parseFloat(String(row[3])) || 0;
      const price = parseFloat(String(row[4])) || 0;
      const salesVolume = parseInt(String(row[5])) || 0;

      const grossMarginAbs = price - cost;
      const grossMarginPct = price > 0 ? (grossMarginAbs / price) * 100 : 0;
      const totalMargin = grossMarginAbs * salesVolume;

      products.push({
        product_id: productId,
        product_name: productName,
        category: category,
        cost: cost,
        price: price,
        sales_volume: salesVolume,
        gross_margin_abs: round(grossMarginAbs, 2),
        gross_margin_pct: round(grossMarginPct, 2),
        total_margin: round(totalMargin, 2),
      });
    } catch (error) {
      console.error('Error parsing product row:', error);
      continue;
    }
  }

  return products.sort((a, b) => b.total_margin - a.total_margin);
}

export function calculateMetrics(products: Product[]): Metrics {
  if (!products || products.length === 0) {
    return {
      total_revenue: 0,
      total_cost: 0,
      total_margin: 0,
      avg_margin_pct: 0,
      margin_pct: 0,
      total_units: 0,
      highest_margin_product: '',
      lowest_margin_product: '',
    };
  }

  const totalRevenue = products.reduce((sum, p) => sum + p.price * p.sales_volume, 0);
  const totalCost = products.reduce((sum, p) => sum + p.cost * p.sales_volume, 0);
  const totalMargin = totalRevenue - totalCost;
  const avgMarginPct = products.reduce((sum, p) => sum + p.gross_margin_pct, 0) / products.length;

  const highestProduct = products.reduce((prev, current) =>
    prev.total_margin > current.total_margin ? prev : current
  );
  const lowestProduct = products.reduce((prev, current) =>
    prev.total_margin < current.total_margin ? prev : current
  );

  return {
    total_revenue: round(totalRevenue, 2),
    total_cost: round(totalCost, 2),
    total_margin: round(totalMargin, 2),
    avg_margin_pct: round(avgMarginPct, 2),
    margin_pct: totalRevenue > 0 ? round((totalMargin / totalRevenue) * 100, 2) : 0,
    total_units: products.reduce((sum, p) => sum + p.sales_volume, 0),
    highest_margin_product: highestProduct.product_name,
    lowest_margin_product: lowestProduct.product_name,
  };
}
