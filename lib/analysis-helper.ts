import { Product, Metrics } from './types';

export interface CategoryStat {
  category: string;
  totalMargin: number;
  totalRevenue: number;
  totalCost: number;
  avgMarginPct: number;
  totalUnits: number;
  products: Product[];
}

export interface PricingRecommendation {
  productName: string;
  currentPrice: number;
  targetMarginPct: number;
  recommendedPrice: number;
  priceChange: number;
}

export interface IfThenScenario {
  scenario: string;
  originalTotal: number;
  newTotal: number;
  difference: number;
  percentChange: number;
}

// 分类统计
export function calculateCategoryStats(products: Product[]): CategoryStat[] {
  const categoryMap = new Map<string, Product[]>();
  
  products.forEach(p => {
    if (!categoryMap.has(p.category)) {
      categoryMap.set(p.category, []);
    }
    categoryMap.get(p.category)!.push(p);
  });

  const stats: CategoryStat[] = [];
  
  categoryMap.forEach((categoryProducts, category) => {
    const totalRevenue = categoryProducts.reduce((sum, p) => sum + p.price * p.sales_volume, 0);
    const totalCost = categoryProducts.reduce((sum, p) => sum + p.cost * p.sales_volume, 0);
    const totalMargin = totalRevenue - totalCost;
    const totalUnits = categoryProducts.reduce((sum, p) => sum + p.sales_volume, 0);
    const avgMarginPct = categoryProducts.reduce((sum, p) => sum + p.gross_margin_pct, 0) / categoryProducts.length;

    stats.push({
      category,
      totalMargin: Math.round(totalMargin * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      avgMarginPct: Math.round(avgMarginPct * 100) / 100,
      totalUnits,
      products: categoryProducts.sort((a, b) => b.total_margin - a.total_margin),
    });
  });

  return stats.sort((a, b) => b.totalMargin - a.totalMargin);
}

// 定价建议
export function generatePricingRecommendations(products: Product[], targetMarginPct: number): PricingRecommendation[] {
  return products.map(p => {
    const recommendedPrice = p.cost / (1 - targetMarginPct / 100);
    const priceChange = recommendedPrice - p.price;
    
    return {
      productName: p.product_name,
      currentPrice: p.price,
      targetMarginPct,
      recommendedPrice: Math.round(recommendedPrice * 100) / 100,
      priceChange: Math.round(priceChange * 100) / 100,
    };
  }).sort((a, b) => b.priceChange - a.priceChange);
}

// 成本分析
export function analyzeCosts(products: Product[]) {
  const byCostPerUnit = products.sort((a, b) => b.cost - a.cost);
  const byTotalCost = products.sort((a, b) => (b.cost * b.sales_volume) - (a.cost * a.sales_volume));
  
  return {
    highestCostPerUnit: byCostPerUnit.slice(0, 5),
    highestTotalCost: byTotalCost.slice(0, 5),
    lowestCostPerUnit: byCostPerUnit.slice(-3).reverse(),
  };
}

// 如果-那么分析
export function generateIfThenScenarios(products: Product[], metrics: Metrics): IfThenScenario[] {
  const scenarios: IfThenScenario[] = [];

  // 场景1：价格增加10%
  const scenario1Total = products.reduce((sum, p) => {
    const newPrice = p.price * 1.1;
    const newMargin = (newPrice - p.cost) * p.sales_volume;
    return sum + newMargin;
  }, 0);
  scenarios.push({
    scenario: '所有产品价格增加 10%',
    originalTotal: Math.round(metrics.total_margin),
    newTotal: Math.round(scenario1Total),
    difference: Math.round(scenario1Total - metrics.total_margin),
    percentChange: Math.round(((scenario1Total - metrics.total_margin) / metrics.total_margin) * 100),
  });

  // 场景2：成本降低5%
  const scenario2Total = products.reduce((sum, p) => {
    const newCost = p.cost * 0.95;
    const newMargin = (p.price - newCost) * p.sales_volume;
    return sum + newMargin;
  }, 0);
  scenarios.push({
    scenario: '所有产品成本降低 5%',
    originalTotal: Math.round(metrics.total_margin),
    newTotal: Math.round(scenario2Total),
    difference: Math.round(scenario2Total - metrics.total_margin),
    percentChange: Math.round(((scenario2Total - metrics.total_margin) / metrics.total_margin) * 100),
  });

  // 场景3：销量增加20%
  const scenario3Total = products.reduce((sum, p) => {
    const newVolume = p.sales_volume * 1.2;
    const newMargin = (p.price - p.cost) * newVolume;
    return sum + newMargin;
  }, 0);
  scenarios.push({
    scenario: '所有产品销量增加 20%',
    originalTotal: Math.round(metrics.total_margin),
    newTotal: Math.round(scenario3Total),
    difference: Math.round(scenario3Total - metrics.total_margin),
    percentChange: Math.round(((scenario3Total - metrics.total_margin) / metrics.total_margin) * 100),
  });

  return scenarios;
}

// 目标设置建议
export function generateTargetRecommendations(products: Product[], metrics: Metrics) {
  return {
    currentMarginPct: metrics.margin_pct,
    recommendedTarget: Math.min(75, Math.round(metrics.margin_pct + 5)),
    topPerformers: products.slice(0, 3),
    needsImprovement: products.slice(-3).reverse(),
    savingOpportunity: {
      description: '通过降低成本 5%，可以增加毛利',
      estimatedIncrease: Math.round(metrics.total_margin * 0.05),
    },
  };
}
