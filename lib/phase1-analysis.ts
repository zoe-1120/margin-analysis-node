import { Product, Metrics } from './types';

export interface ProductRecommendation {
  productName: string;
  category: string;
  type: 'star' | 'potential' | 'clearance';
  marginPct: number;
  revenue: number;
  units: number;
  reason: string;
  action: string;
}

export interface AnomalyAlert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedProducts: string[];
  recommendation: string;
}

// 产品推荐：分类为明星/潜力/清库
export function generateProductRecommendations(products: Product[], metrics: Metrics): ProductRecommendation[] {
  const avgMarginPct = metrics.avg_margin_pct;
  const avgRevenue = metrics.total_revenue / products.length;
  const recommendations: ProductRecommendation[] = [];

  products.forEach(p => {
    const revenue = p.price * p.sales_volume;
    let type: 'star' | 'potential' | 'clearance' = 'potential';
    let action = '';
    let reason = '';

    if (p.gross_margin_pct > avgMarginPct && revenue > avgRevenue) {
      // 明星产品：高毛利率 + 高销售额
      type = 'star';
      reason = '高毛利率和高销售额';
      action = '维持价格，增加营销投入，扩大产能';
    } else if (p.gross_margin_pct < avgMarginPct * 0.8 && revenue < avgRevenue * 0.5) {
      // 清库产品：低毛利率 + 低销售额
      type = 'clearance';
      reason = '低毛利率和低销售额';
      action = '考虑下架或清库，释放产能';
    } else if (p.gross_margin_pct > avgMarginPct && revenue < avgRevenue) {
      // 潜力产品：高毛利率但销售不足
      type = 'potential';
      reason = '毛利率良好但销售额不足';
      action = '增加营销，开拓新渠道';
    } else if (p.gross_margin_pct < avgMarginPct && revenue > avgRevenue) {
      // 潜力产品：销售好但毛利率低
      type = 'potential';
      reason = '销售良好但毛利率需改善';
      action = '逐步提价或优化成本';
    }

    recommendations.push({
      productName: p.product_name,
      category: p.category,
      type,
      marginPct: Math.round(p.gross_margin_pct * 100) / 100,
      revenue: Math.round(revenue * 100) / 100,
      units: p.sales_volume,
      reason,
      action,
    });
  });

  // 按类型排序：明星 -> 潜力 -> 清库
  return recommendations.sort((a, b) => {
    const typeOrder = { star: 0, potential: 1, clearance: 2 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return b.revenue - a.revenue;
  });
}

// 异常告警系统
export function generateAnomalyAlerts(products: Product[], metrics: Metrics): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  const avgMarginPct = metrics.avg_margin_pct;
  const avgRevenue = metrics.total_revenue / products.length;

  // 告警1：严重低毛利率产品
  const lowMarginProducts = products.filter(p => p.gross_margin_pct < avgMarginPct * 0.7);
  if (lowMarginProducts.length > 0) {
    alerts.push({
      id: 'alert-low-margin',
      severity: 'high',
      title: `⚠️ 严重低毛利率警告`,
      description: `${lowMarginProducts.length} 个产品的毛利率下降超过 30%`,
      affectedProducts: lowMarginProducts.map(p => p.product_name),
      recommendation: '检查成本控制，考虑提价或改进生产工艺',
    });
  }

  // 告警2：销量异常下降
  const lowVolumeProducts = products.filter(p => p.sales_volume < metrics.total_units / products.length * 0.3);
  if (lowVolumeProducts.length > 0) {
    alerts.push({
      id: 'alert-low-volume',
      severity: 'medium',
      title: `📉 销量异常下降`,
      description: `${lowVolumeProducts.length} 个产品销量不足平均水平的 30%`,
      affectedProducts: lowVolumeProducts.map(p => p.product_name),
      recommendation: '分析市场需求，加强营销或考虑改进产品',
    });
  }

  // 告警3：高成本产品
  const highCostProducts = products.filter(p => p.cost > products.reduce((sum, prod) => sum + prod.cost, 0) / products.length * 1.5);
  if (highCostProducts.length > 0) {
    alerts.push({
      id: 'alert-high-cost',
      severity: 'medium',
      title: `💰 成本异常偏高`,
      description: `${highCostProducts.length} 个产品的成本超过平均水平 50%`,
      affectedProducts: highCostProducts.map(p => p.product_name),
      recommendation: '优化供应链，寻找替代物料或改进采购流程',
    });
  }

  // 告警4：毛利率负数
  const negativeMarginProducts = products.filter(p => p.gross_margin_pct < 0);
  if (negativeMarginProducts.length > 0) {
    alerts.push({
      id: 'alert-negative-margin',
      severity: 'high',
      title: `🚨 严重亏损产品`,
      description: `${negativeMarginProducts.length} 个产品毛利为负，正在亏本销售`,
      affectedProducts: negativeMarginProducts.map(p => p.product_name),
      recommendation: '立即停止生产或提价，这些产品正在损害整体盈利能力',
    });
  }

  // 告警5：产品结构不均衡
  const topProducts = [...products].sort((a, b) => (b.price * b.sales_volume) - (a.price * a.sales_volume)).slice(0, 3);
  const topProductRevenue = topProducts.reduce((sum, p) => sum + p.price * p.sales_volume, 0);
  const revenueConcentration = topProductRevenue / metrics.total_revenue;
  if (revenueConcentration > 0.6) {
    alerts.push({
      id: 'alert-concentration',
      severity: 'low',
      title: `📊 产品结构不均衡`,
      description: `前 3 个产品贡献了 ${Math.round(revenueConcentration * 100)}% 的销售额，风险较高`,
      affectedProducts: topProducts.map(p => p.product_name),
      recommendation: '培养新的优势产品，分散收入来源',
    });
  }

  return alerts;
}

// 历史趋势分析（为未来功能预留）
export interface HistoricalTrend {
  date: string;
  totalMargin: number;
  avgMarginPct: number;
  totalRevenue: number;
  productCount: number;
}

export function calculateHistoricalTrends(analyses: any[]): HistoricalTrend[] {
  // TODO: 实现历史对比分析
  // 当有多个分析时，计算月度/年度对比
  return [];
}
