import { Product, Metrics } from './types';
import { CategoryStat } from './analysis-helper';

export async function generatePDFReport(
  products: Product[],
  metrics: Metrics,
  categoryStats: CategoryStat[],
  timestamp: string
) {
  // 创建HTML内容
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <title>产品毛利率分析报告</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .container {
          background: white;
          max-width: 900px;
          margin: 0 auto;
          padding: 40px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #002528;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          color: #002528;
          font-size: 24px;
        }
        .header p {
          margin: 5px 0 0 0;
          color: #b09b7b;
          font-size: 12px;
        }
        .metrics {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 30px;
        }
        .metric-card {
          background: #f9f9f9;
          border: 1px solid #b09b7b;
          padding: 15px;
          text-align: center;
          border-radius: 4px;
        }
        .metric-value {
          font-size: 20px;
          font-weight: bold;
          color: #b09b7b;
          margin: 10px 0;
        }
        .metric-label {
          font-size: 12px;
          color: #666;
        }
        .section {
          margin-bottom: 30px;
        }
        .section-title {
          background: #002528;
          color: white;
          padding: 10px 15px;
          font-weight: bold;
          margin-bottom: 15px;
          border-left: 4px solid #b09b7b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        th {
          background: #f5f5f5;
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
          font-weight: bold;
          font-size: 12px;
        }
        td {
          border: 1px solid #ddd;
          padding: 10px;
          font-size: 12px;
        }
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        .text-gold {
          color: #b09b7b;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          color: #999;
          font-size: 11px;
          margin-top: 40px;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .page-break {
          page-break-after: always;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- 头部 -->
        <div class="header">
          <h1>📊 产品毛利率分析报告</h1>
          <p>生成时间: ${new Date(timestamp).toLocaleString('zh-CN')}</p>
        </div>

        <!-- 关键指标 -->
        <div class="metrics">
          <div class="metric-card">
            <div class="metric-label">总毛利</div>
            <div class="metric-value">RM${Math.round(metrics.total_margin).toLocaleString()}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">平均毛利率</div>
            <div class="metric-value">${metrics.avg_margin_pct}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">综合毛利率</div>
            <div class="metric-value">${metrics.margin_pct}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">总销售量</div>
            <div class="metric-value">${metrics.total_units}</div>
          </div>
        </div>

        <!-- 产品详情 -->
        <div class="section">
          <div class="section-title">产品毛利分析详情</div>
          <table>
            <thead>
              <tr>
                <th>产品名称</th>
                <th>分类</th>
                <th>成本</th>
                <th>价格</th>
                <th>销量</th>
                <th>毛利(单位)</th>
                <th>毛利率</th>
                <th>总毛利</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>${p.product_name}</td>
                  <td>${p.category}</td>
                  <td>RM${p.cost.toFixed(2)}</td>
                  <td>RM${p.price.toFixed(2)}</td>
                  <td>${p.sales_volume}</td>
                  <td class="text-gold">RM${p.gross_margin_abs.toFixed(2)}</td>
                  <td class="text-gold">${p.gross_margin_pct}%</td>
                  <td class="text-gold">RM${Math.round(p.total_margin).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 分类统计 -->
        <div class="section page-break">
          <div class="section-title">按分类汇总统计</div>
          <table>
            <thead>
              <tr>
                <th>分类</th>
                <th>产品数</th>
                <th>总收入</th>
                <th>总成本</th>
                <th>总毛利</th>
                <th>平均毛利率</th>
                <th>销售量</th>
              </tr>
            </thead>
            <tbody>
              ${categoryStats.map(c => `
                <tr>
                  <td>${c.category}</td>
                  <td>${c.products.length}</td>
                  <td>RM${Math.round(c.totalRevenue).toLocaleString()}</td>
                  <td>RM${Math.round(c.totalCost).toLocaleString()}</td>
                  <td class="text-gold">RM${Math.round(c.totalMargin).toLocaleString()}</td>
                  <td class="text-gold">${c.avgMarginPct}%</td>
                  <td>${c.totalUnits}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 页脚 -->
        <div class="footer">
          <p>© 2024 产品毛利率分析平台 | 保密文件</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return htmlContent;
}
