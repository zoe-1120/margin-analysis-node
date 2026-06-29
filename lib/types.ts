export interface Product {
  product_id: string;
  product_name: string;
  category: string;
  cost: number;
  price: number;
  sales_volume: number;
  gross_margin_abs: number;
  gross_margin_pct: number;
  total_margin: number;
}

export interface Metrics {
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  avg_margin_pct: number;
  margin_pct: number;
  total_units: number;
  highest_margin_product: string;
  lowest_margin_product: string;
}

export interface AnalysisData {
  id: number;
  timestamp: string;
  products: Product[];
  metrics: Metrics;
  financials: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
