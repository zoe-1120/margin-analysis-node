'use client';

import { useState, useRef, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  calculateCategoryStats,
  generatePricingRecommendations,
  analyzeCosts,
  generateIfThenScenarios,
  generateTargetRecommendations,
  type CategoryStat,
  type PricingRecommendation,
  type IfThenScenario,
} from '@/lib/analysis-helper';
import { generatePDFReport } from '@/lib/pdf-export';

interface Product {
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

interface Metrics {
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  avg_margin_pct: number;
  margin_pct: number;
  total_units: number;
  highest_margin_product: string;
  lowest_margin_product: string;
}

interface AnalysisResult {
  products: Product[];
  metrics: Metrics;
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'pricing' | 'scenarios' | 'targets'>('overview');
  const [targetMarginPct, setTargetMarginPct] = useState(70);
  const [pricingRecs, setPricingRecs] = useState<PricingRecommendation[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [scenarios, setScenarios] = useState<IfThenScenario[]>([]);
  const [costAnalysis, setCostAnalysis] = useState<any>(null);
  const [targetRecs, setTargetRecs] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 颜色定义
  const colors = {
    darkBg1: '#002528',
    darkBg2: '#00423f',
    goldMain: '#b09b7b',
    goldSecondary: '#9a8a6e',
    white: '#ffffff',
    text: '#ffffff',
    textSecondary: '#9a8a6e',
  };

  // 图表颜色
  const chartColors = ['#b09b7b', '#9a8a6e', '#d4af7a', '#8b7a5e', '#c9a96f'];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    setUploadedFiles(Array.from(files).map(f => f.name));
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files || fileInputRef.current.files.length === 0) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      Array.from(fileInputRef.current.files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('上传失败');

      const data = await response.json();
      const newAnalysis = {
        products: data.products || [],
        metrics: data.metrics || {},
      };
      setAnalysis(newAnalysis);

      // 计算所有高级分析
      const catStats = calculateCategoryStats(newAnalysis.products);
      setCategoryStats(catStats);
      setPricingRecs(generatePricingRecommendations(newAnalysis.products, 70));
      setCostAnalysis(analyzeCosts(newAnalysis.products));
      setScenarios(generateIfThenScenarios(newAnalysis.products, newAnalysis.metrics));
      setTargetRecs(generateTargetRecommendations(newAnalysis.products, newAnalysis.metrics));

      setActiveTab('overview');
    } catch (error) {
      alert('分析失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsLoading(false);
    }
  };

  const updatePricingTarget = (targetPct: number) => {
    setTargetMarginPct(targetPct);
    if (analysis) {
      setPricingRecs(generatePricingRecommendations(analysis.products, targetPct));
    }
  };

  const handleExportPDF = async () => {
    if (!analysis) return;
    try {
      // 动态导入pdf库
      const html2canvas = await import('html2canvas');
      const jsPDF = await import('jspdf');

      const element = document.getElementById('report-content');
      if (!element) return;

      const canvas = await html2canvas.default(element, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF.jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

      pdf.save('margin-analysis-report.pdf');
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('PDF导出失败');
    }
  };

  if (!analysis) {
    return (
      <div style={{
        background: `linear-gradient(135deg, ${colors.darkBg1} 0%, ${colors.darkBg2} 100%)`,
        minHeight: '100vh',
        color: colors.white,
        fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 左侧金色竖条 */}
        <div style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '5px',
          height: '100%',
          background: colors.goldMain,
          zIndex: 100,
          boxShadow: `4px 0 12px rgba(0, 0, 0, 0.5)`,
        }} />

        {/* 顶部品牌区域 */}
        <header style={{
          background: `rgba(0, 37, 40, 0.7)`,
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${colors.goldMain}`,
          padding: '30px 40px 30px 50px',
          boxShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px', marginBottom: '8px' }}>
              <span style={{ fontSize: '32px' }}>📊</span>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '700',
                margin: 0,
                letterSpacing: '0.5px',
                color: colors.white,
              }}>
                产品毛利率分析平台
              </h1>
            </div>
            <p style={{
              fontSize: '13px',
              margin: '0 0 0 47px',
              color: colors.goldMain,
              fontStyle: 'italic',
              letterSpacing: '0.5px',
            }}>
              通过财务报表和产品数据分析你的毛利策略
            </p>
          </div>
        </header>

        {/* 主内容区域 */}
        <main style={{
          flex: 1,
          padding: '50px 40px 50px 50px',
          overflowY: 'auto',
        }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '380px 1fr',
              gap: '50px',
              alignItems: 'start',
            }}>
              {/* 左侧上传卡片 */}
              <div style={{
                background: `rgba(255, 255, 255, 0.08)`,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${colors.goldMain}`,
                borderRadius: '12px',
                padding: '40px 30px',
                boxShadow: `0 8px 32px rgba(0, 0, 0, 0.2)`,
              }}>
                <h2 style={{
                  fontSize: '14px',
                  color: colors.goldMain,
                  margin: '0 0 30px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                }}>
                  📁 上传文件
                </h2>

                {/* 拖拽上传区域 */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragActive ? colors.goldSecondary : colors.goldMain}`,
                    borderRadius: '8px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: dragActive ? `rgba(176, 155, 123, 0.15)` : `rgba(176, 155, 123, 0.08)`,
                    marginBottom: '25px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `rgba(176, 155, 123, 0.15)`;
                    e.currentTarget.style.borderColor = colors.goldSecondary;
                  }}
                  onMouseLeave={(e) => {
                    if (!dragActive) {
                      e.currentTarget.style.background = `rgba(176, 155, 123, 0.08)`;
                      e.currentTarget.style.borderColor = colors.goldMain;
                    }
                  }}
                >
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '12px',
                    animation: dragActive ? 'pulse 0.6s ease-in-out' : 'none',
                  }}>
                    📤
                  </div>
                  <p style={{
                    margin: '0 0 6px 0',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.white,
                  }}>
                    点击或拖拽上传
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: colors.textSecondary,
                  }}>
                    支持 Excel (.xlsx) 格式
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".xlsx"
                  onChange={handleChange}
                  style={{ display: 'none' }}
                />

                {/* 已选文件列表 */}
                {uploadedFiles.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{
                      fontSize: '11px',
                      color: colors.goldMain,
                      margin: '0 0 10px 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      已选择 {uploadedFiles.length} 个文件
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {uploadedFiles.map((name, i) => (
                        <div key={i} style={{
                          background: `rgba(176, 155, 123, 0.12)`,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          color: colors.white,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}>
                          <span style={{ color: colors.goldMain }}>✓</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 分析按钮 */}
                <button
                  onClick={handleUpload}
                  disabled={uploadedFiles.length === 0 || isLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: uploadedFiles.length > 0 && !isLoading
                      ? `linear-gradient(135deg, ${colors.goldMain} 0%, ${colors.goldSecondary} 100%)`
                      : `rgba(154, 138, 110, 0.3)`,
                    color: uploadedFiles.length > 0 && !isLoading ? '#002528' : colors.textSecondary,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: uploadedFiles.length > 0 && !isLoading ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: '700',
                    transition: 'all 0.3s ease',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}
                >
                  {isLoading ? '⏳ 分析中...' : '开始分析'}
                </button>
              </div>

              {/* 右侧说明区域 */}
              <div>
                <h2 style={{
                  fontSize: '16px',
                  color: colors.white,
                  marginBottom: '20px',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                }}>
                  📋 支持的文件格式
                </h2>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '15px',
                }}>
                  {[
                    {
                      title: '产品表 (必需)',
                      icon: '📦',
                      items: ['产品ID', '产品名称', '分类', '成本', '价格', '销量']
                    },
                    {
                      title: '财务报表 (可选)',
                      icon: '📊',
                      items: ['损益表 (P&L)', '资产负债表 (Balance Sheet)', '现金流量表 (Cash Flow)']
                    }
                  ].map((section, i) => (
                    <div key={i} style={{
                      background: `rgba(255, 255, 255, 0.08)`,
                      backdropFilter: 'blur(15px)',
                      border: `1px solid rgba(176, 155, 123, 0.3)`,
                      borderRadius: '8px',
                      padding: '20px',
                    }}>
                      <h3 style={{
                        fontSize: '13px',
                        color: colors.goldMain,
                        margin: '0 0 12px 0',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <span style={{ fontSize: '16px' }}>{section.icon}</span>
                        {section.title}
                      </h3>
                      <ul style={{
                        margin: 0,
                        paddingLeft: '20px',
                        fontSize: '12px',
                        lineHeight: '1.6',
                        color: colors.textSecondary,
                      }}>
                        {section.items.map((item, j) => (
                          <li key={j}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: '20px',
                  background: `rgba(176, 155, 123, 0.1)`,
                  border: `1px solid ${colors.goldMain}`,
                  borderRadius: '8px',
                  padding: '15px',
                  fontSize: '12px',
                  color: colors.white,
                  lineHeight: '1.6',
                }}>
                  <p style={{ margin: 0, marginBottom: '8px', fontWeight: '600', color: colors.goldMain }}>
                    💡 提示
                  </p>
                  <p style={{ margin: 0 }}>
                    所有 Excel 文件应该在第一行包含列标题。系统会自动识别和处理您的数据。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* 底部金色横条 */}
        <div style={{
          height: '4px',
          background: `linear-gradient(90deg, ${colors.goldMain} 0%, ${colors.goldSecondary} 100%)`,
          boxShadow: `0 -2px 12px rgba(0, 0, 0, 0.3)`,
        }} />

        {/* 页脚 */}
        <footer style={{
          background: `rgba(0, 37, 40, 0.7)`,
          backdropFilter: 'blur(20px)',
          padding: '20px 40px 20px 50px',
          textAlign: 'center',
          fontSize: '12px',
          color: colors.textSecondary,
          borderTop: `1px solid rgba(176, 155, 123, 0.2)`,
        }}>
          <p style={{ margin: 0 }}>
            © 2024 产品毛利率分析平台 | 高级财务分析工具
          </p>
        </footer>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
          }
          ::-webkit-scrollbar-thumb {
            background: #b09b7b;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #9a8a6e;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${colors.darkBg1} 0%, ${colors.darkBg2} 100%)`,
      minHeight: '100vh',
      color: colors.white,
      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 左侧金色竖条 */}
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '5px',
        height: '100%',
        background: colors.goldMain,
        zIndex: 100,
        boxShadow: `4px 0 12px rgba(0, 0, 0, 0.5)`,
      }} />

      {/* 顶部品牌区域 */}
      <header style={{
        background: `rgba(0, 37, 40, 0.7)`,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${colors.goldMain}`,
        padding: '30px 40px 30px 50px',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px', marginBottom: '8px' }}>
            <span style={{ fontSize: '32px' }}>📊</span>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              margin: 0,
              letterSpacing: '0.5px',
              color: colors.white,
            }}>
              产品毛利率分析平台
            </h1>
          </div>
          <p style={{
            fontSize: '13px',
            margin: '0 0 0 47px',
            color: colors.goldMain,
            fontStyle: 'italic',
            letterSpacing: '0.5px',
          }}>
            通过财务报表和产品数据分析你的毛利策略
          </p>
        </div>
      </header>

      {/* 选项卡导航 */}
      <div style={{
        background: `rgba(0, 37, 40, 0.5)`,
        borderBottom: `1px solid rgba(176, 155, 123, 0.2)`,
        padding: '0 40px 0 50px',
        display: 'flex',
        gap: '30px',
        maxWidth: '1400px',
        margin: '0 auto',
        width: 'calc(100% - 90px)',
      }}>
        {[
          { id: 'overview' as const, label: '📊 概览', emoji: '📊' },
          { id: 'categories' as const, label: '📁 分类统计', emoji: '📁' },
          { id: 'pricing' as const, label: '💰 定价推荐', emoji: '💰' },
          { id: 'scenarios' as const, label: '🎯 场景分析', emoji: '🎯' },
          { id: 'targets' as const, label: '🎪 目标分析', emoji: '🎪' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === tab.id ? colors.goldMain : colors.textSecondary,
              padding: '20px 0',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? '700' : '500',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? `2px solid ${colors.goldMain}` : 'none',
              transition: 'all 0.3s ease',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.goldMain;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = colors.textSecondary;
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 主内容区域 */}
      <main style={{
        flex: 1,
        padding: '40px 40px 40px 50px',
        overflowY: 'auto',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {activeTab === 'overview' && (
            <div>
              {/* 指标卡片网格 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '20px',
                marginBottom: '40px',
              }}>
                {[
                  { label: '总毛利', value: `¥${Math.round(analysis.metrics.total_margin).toLocaleString()}`, icon: '💰', color: colors.goldMain },
                  { label: '平均毛利率', value: `${analysis.metrics.avg_margin_pct.toFixed(2)}%`, icon: '📈', color: colors.goldMain },
                  { label: '综合毛利率', value: `${analysis.metrics.margin_pct.toFixed(2)}%`, icon: '📊', color: colors.goldSecondary },
                  { label: '总销售量', value: `${analysis.metrics.total_units}`, icon: '🛍️', color: colors.goldSecondary },
                ].map((metric, i) => (
                  <div key={i} style={{
                    background: `rgba(255, 255, 255, 0.08)`,
                    border: `1px solid ${metric.color}`,
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    backdropFilter: 'blur(15px)',
                    transition: 'all 0.3s ease',
                    boxShadow: `inset 0 1px 0 rgba(176, 155, 123, 0.2)`,
                  }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = `0 8px 24px rgba(176, 155, 123, 0.2), inset 0 1px 0 rgba(176, 155, 123, 0.2)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `inset 0 1px 0 rgba(176, 155, 123, 0.2)`;
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '12px' }}>{metric.icon}</div>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      color: metric.color,
                      marginBottom: '6px',
                    }}>
                      {metric.value}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: colors.textSecondary,
                      fontWeight: '500',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}>
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* 图表 - 产品毛利对比 */}
              <div style={{
                background: `rgba(255, 255, 255, 0.08)`,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${colors.goldMain}`,
                borderRadius: '8px',
                padding: '30px',
                marginBottom: '30px',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  color: colors.goldMain,
                  margin: '0 0 20px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  📊 产品毛利对比
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysis.products.slice(0, 10).map(p => ({
                    name: p.product_name.substring(0, 15),
                    margin: Math.round(p.total_margin),
                    pct: parseFloat(p.gross_margin_pct.toString()),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(176, 155, 123, 0.3)" />
                    <XAxis dataKey="name" stroke={colors.textSecondary} />
                    <YAxis stroke={colors.textSecondary} />
                    <Tooltip contentStyle={{ background: colors.darkBg1, border: `1px solid ${colors.goldMain}`, borderRadius: '6px' }} />
                    <Legend />
                    <Bar dataKey="margin" fill={colors.goldMain} name="总毛利 (¥)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 分类分布饼图 */}
              <div style={{
                background: `rgba(255, 255, 255, 0.08)`,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${colors.goldMain}`,
                borderRadius: '8px',
                padding: '30px',
                marginBottom: '30px',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  color: colors.goldMain,
                  margin: '0 0 20px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  🎯 分类毛利分布
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryStats.map(c => ({
                        name: c.category,
                        value: Math.round(c.totalMargin),
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ¥${value.toLocaleString()}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 产品详情表格 */}
              <div style={{
                background: `rgba(255, 255, 255, 0.08)`,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${colors.goldMain}`,
                borderRadius: '8px',
                padding: '30px',
                overflow: 'auto',
              }}>
                <h2 style={{
                  fontSize: '16px',
                  color: colors.goldMain,
                  margin: '0 0 24px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  📦 产品毛利分析详情
                </h2>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                  }}>
                    <thead>
                      <tr style={{
                        borderBottom: `2px solid ${colors.goldMain}`,
                        background: `rgba(176, 155, 123, 0.1)`,
                      }}>
                        {[
                          '产品名称', '分类', '成本', '价格', '销量',
                          '毛利(单位)', '毛利率', '总毛利'
                        ].map((h) => (
                          <th key={h} style={{
                            padding: '14px 12px',
                            textAlign: 'left',
                            color: colors.goldMain,
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            letterSpacing: '1px',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.products.map((product, i) => (
                        <tr key={i} style={{
                          borderBottom: `1px solid rgba(176, 155, 123, 0.2)`,
                          background: i % 2 === 0 ? `rgba(176, 155, 123, 0.08)` : 'transparent',
                          transition: 'background 0.3s ease',
                        }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `rgba(176, 155, 123, 0.15)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = i % 2 === 0 ? `rgba(176, 155, 123, 0.08)` : 'transparent';
                          }}
                        >
                          <td style={{ padding: '12px' }}>{product.product_name}</td>
                          <td style={{ padding: '12px' }}>{product.category}</td>
                          <td style={{ padding: '12px' }}>¥{product.cost.toFixed(2)}</td>
                          <td style={{ padding: '12px' }}>¥{product.price.toFixed(2)}</td>
                          <td style={{ padding: '12px' }}>{product.sales_volume}</td>
                          <td style={{ padding: '12px', color: colors.goldMain, fontWeight: '600' }}>
                            ¥{product.gross_margin_abs.toFixed(2)}
                          </td>
                          <td style={{ padding: '12px', color: colors.goldMain, fontWeight: '700' }}>
                            {product.gross_margin_pct}%
                          </td>
                          <td style={{ padding: '12px', color: colors.goldSecondary, fontWeight: '700' }}>
                            ¥{Math.round(product.total_margin).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div>
              <h2 style={{
                fontSize: '20px',
                color: colors.goldMain,
                margin: '0 0 30px 0',
                fontWeight: '700',
              }}>
                📁 分类统计分析
              </h2>

              {/* 分类统计表格 */}
              <div style={{
                background: `rgba(255, 255, 255, 0.08)`,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${colors.goldMain}`,
                borderRadius: '8px',
                padding: '30px',
                overflow: 'auto',
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                  }}>
                    <thead>
                      <tr style={{
                        borderBottom: `2px solid ${colors.goldMain}`,
                        background: `rgba(176, 155, 123, 0.1)`,
                      }}>
                        {[
                          '分类', '产品数', '总收入', '总成本', '总毛利', '平均毛利率', '总销售量'
                        ].map((h) => (
                          <th key={h} style={{
                            padding: '14px 12px',
                            textAlign: 'left',
                            color: colors.goldMain,
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            letterSpacing: '1px',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryStats.map((cat, i) => (
                        <tr key={i} style={{
                          borderBottom: `1px solid rgba(176, 155, 123, 0.2)`,
                          background: i % 2 === 0 ? `rgba(176, 155, 123, 0.08)` : 'transparent',
                          transition: 'background 0.3s ease',
                        }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `rgba(176, 155, 123, 0.15)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = i % 2 === 0 ? `rgba(176, 155, 123, 0.08)` : 'transparent';
                          }}
                        >
                          <td style={{ padding: '12px', color: colors.goldMain, fontWeight: '600' }}>{cat.category}</td>
                          <td style={{ padding: '12px' }}>{cat.products.length}</td>
                          <td style={{ padding: '12px' }}>¥{Math.round(cat.totalRevenue).toLocaleString()}</td>
                          <td style={{ padding: '12px' }}>¥{Math.round(cat.totalCost).toLocaleString()}</td>
                          <td style={{ padding: '12px', color: colors.goldSecondary, fontWeight: '700' }}>
                            ¥{Math.round(cat.totalMargin).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px', color: colors.goldMain, fontWeight: '700' }}>
                            {cat.avgMarginPct.toFixed(2)}%
                          </td>
                          <td style={{ padding: '12px' }}>{cat.totalUnits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 分类对比图表 */}
              <div style={{
                background: `rgba(255, 255, 255, 0.08)`,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${colors.goldMain}`,
                borderRadius: '8px',
                padding: '30px',
                marginTop: '30px',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  color: colors.goldMain,
                  margin: '0 0 20px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  📊 分类毛利率对比
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryStats.map(c => ({
                    name: c.category,
                    margin: c.avgMarginPct,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(176, 155, 123, 0.3)" />
                    <XAxis dataKey="name" stroke={colors.textSecondary} />
                    <YAxis stroke={colors.textSecondary} />
                    <Tooltip contentStyle={{ background: colors.darkBg1, border: `1px solid ${colors.goldMain}`, borderRadius: '6px' }} />
                    <Bar dataKey="margin" fill={colors.goldMain} name="平均毛利率 (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div>
              <h2 style={{
                fontSize: '20px',
                color: colors.goldMain,
                margin: '0 0 10px 0',
                fontWeight: '700',
              }}>
                💰 定价推荐分析
              </h2>

              <div style={{
                background: `rgba(255, 255, 255, 0.08)`,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${colors.goldMain}`,
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '30px',
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.white,
                }}>
                  目标毛利率:
                  <input
                    type="range"
                    min="10"
                    max="95"
                    value={targetMarginPct}
                    onChange={(e) => updatePricingTarget(parseInt(e.target.value))}
                    style={{
                      width: '200px',
                      accentColor: colors.goldMain,
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ color: colors.goldMain, fontWeight: '700', minWidth: '50px' }}>
                    {targetMarginPct}%
                  </span>
                </label>
              </div>

              {/* 定价建议表格 */}
              <div style={{
                background: `rgba(255, 255, 255, 0.08)`,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${colors.goldMain}`,
                borderRadius: '8px',
                padding: '30px',
                overflow: 'auto',
              }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                  }}>
                    <thead>
                      <tr style={{
                        borderBottom: `2px solid ${colors.goldMain}`,
                        background: `rgba(176, 155, 123, 0.1)`,
                      }}>
                        {[
                          '产品', '成本', '当前价格', '推荐价格', '价格调整', '目标毛利率'
                        ].map((h) => (
                          <th key={h} style={{
                            padding: '14px 12px',
                            textAlign: 'left',
                            color: colors.goldMain,
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            letterSpacing: '1px',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pricingRecs.map((rec, i) => (
                        <tr key={i} style={{
                          borderBottom: `1px solid rgba(176, 155, 123, 0.2)`,
                          background: i % 2 === 0 ? `rgba(176, 155, 123, 0.08)` : 'transparent',
                          transition: 'background 0.3s ease',
                        }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = `rgba(176, 155, 123, 0.15)`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = i % 2 === 0 ? `rgba(176, 155, 123, 0.08)` : 'transparent';
                          }}
                        >
                          <td style={{ padding: '12px', color: colors.goldMain, fontWeight: '600' }}>
                            {rec.productName}
                          </td>
                          <td style={{ padding: '12px' }}>¥{rec.currentPrice.toFixed(2)}</td>
                          <td style={{ padding: '12px' }}>¥{rec.currentPrice.toFixed(2)}</td>
                          <td style={{ padding: '12px', color: colors.goldSecondary, fontWeight: '700' }}>
                            ¥{rec.recommendedPrice.toFixed(2)}
                          </td>
                          <td style={{
                            padding: '12px',
                            color: rec.priceChange > 0 ? '#ff6b6b' : '#51cf66',
                            fontWeight: '700',
                          }}>
                            {rec.priceChange > 0 ? '+' : ''}{rec.priceChange.toFixed(2)}¥ ({((rec.priceChange / rec.currentPrice) * 100).toFixed(1)}%)
                          </td>
                          <td style={{ padding: '12px', color: colors.goldMain, fontWeight: '700' }}>
                            {rec.targetMarginPct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scenarios' && (
            <div>
              <h2 style={{
                fontSize: '20px',
                color: colors.goldMain,
                margin: '0 0 30px 0',
                fontWeight: '700',
              }}>
                🎯 场景分析 (If-Then)
              </h2>

              {/* 场景对比卡片 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
                marginBottom: '30px',
              }}>
                {scenarios.map((scenario, i) => {
                  const isPositive = scenario.difference >= 0;
                  return (
                    <div key={i} style={{
                      background: `rgba(255, 255, 255, 0.08)`,
                      backdropFilter: 'blur(15px)',
                      border: `1px solid ${colors.goldMain}`,
                      borderRadius: '8px',
                      padding: '24px',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                    }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = `0 8px 24px rgba(176, 155, 123, 0.2)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <h3 style={{
                        fontSize: '14px',
                        color: colors.goldMain,
                        margin: '0 0 16px 0',
                        fontWeight: '700',
                      }}>
                        {scenario.scenario}
                      </h3>

                      <div style={{
                        background: `rgba(176, 155, 123, 0.1)`,
                        borderRadius: '6px',
                        padding: '12px',
                        marginBottom: '12px',
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: colors.textSecondary,
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                          fontWeight: '600',
                        }}>
                          原始毛利
                        </div>
                        <div style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          color: colors.goldSecondary,
                        }}>
                          ¥{Math.round(scenario.originalTotal).toLocaleString()}
                        </div>
                      </div>

                      <div style={{
                        background: `rgba(176, 155, 123, 0.1)`,
                        borderRadius: '6px',
                        padding: '12px',
                        marginBottom: '12px',
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: colors.textSecondary,
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                          fontWeight: '600',
                        }}>
                          新增毛利
                        </div>
                        <div style={{
                          fontSize: '20px',
                          fontWeight: '700',
                          color: colors.goldMain,
                        }}>
                          ¥{Math.round(scenario.newTotal).toLocaleString()}
                        </div>
                      </div>

                      <div style={{
                        background: isPositive ? 'rgba(81, 207, 102, 0.15)' : 'rgba(255, 107, 107, 0.15)',
                        borderRadius: '6px',
                        padding: '12px',
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: colors.textSecondary,
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                          fontWeight: '600',
                        }}>
                          变化
                        </div>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: isPositive ? '#51cf66' : '#ff6b6b',
                        }}>
                          {isPositive ? '+' : ''}{Math.round(scenario.difference).toLocaleString()}¥
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isPositive ? '#51cf66' : '#ff6b6b',
                          marginTop: '4px',
                        }}>
                          {isPositive ? '+' : ''}{scenario.percentChange.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 场景详情表格 */}
              <div style={{
                background: `rgba(255, 255, 255, 0.08)`,
                backdropFilter: 'blur(15px)',
                border: `1px solid ${colors.goldMain}`,
                borderRadius: '8px',
                padding: '30px',
              }}>
                <h3 style={{
                  fontSize: '14px',
                  color: colors.goldMain,
                  margin: '0 0 20px 0',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  📊 场景详细对比
                </h3>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                  }}>
                    <thead>
                      <tr style={{
                        borderBottom: `2px solid ${colors.goldMain}`,
                        background: `rgba(176, 155, 123, 0.1)`,
                      }}>
                        {[
                          '场景', '原始毛利', '新增毛利', '差异', '变化百分比'
                        ].map((h) => (
                          <th key={h} style={{
                            padding: '14px 12px',
                            textAlign: 'left',
                            color: colors.goldMain,
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            letterSpacing: '1px',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map((scenario, i) => {
                        const isPositive = scenario.difference >= 0;
                        return (
                          <tr key={i} style={{
                            borderBottom: `1px solid rgba(176, 155, 123, 0.2)`,
                            background: i % 2 === 0 ? `rgba(176, 155, 123, 0.08)` : 'transparent',
                            transition: 'background 0.3s ease',
                          }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = `rgba(176, 155, 123, 0.15)`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = i % 2 === 0 ? `rgba(176, 155, 123, 0.08)` : 'transparent';
                            }}
                          >
                            <td style={{ padding: '12px', color: colors.goldMain, fontWeight: '600' }}>
                              {scenario.scenario}
                            </td>
                            <td style={{ padding: '12px' }}>¥{Math.round(scenario.originalTotal).toLocaleString()}</td>
                            <td style={{ padding: '12px', color: colors.goldSecondary, fontWeight: '700' }}>
                              ¥{Math.round(scenario.newTotal).toLocaleString()}
                            </td>
                            <td style={{
                              padding: '12px',
                              color: isPositive ? '#51cf66' : '#ff6b6b',
                              fontWeight: '700',
                            }}>
                              {isPositive ? '+' : ''}¥{Math.round(scenario.difference).toLocaleString()}
                            </td>
                            <td style={{
                              padding: '12px',
                              color: isPositive ? '#51cf66' : '#ff6b6b',
                              fontWeight: '700',
                            }}>
                              {isPositive ? '+' : ''}{scenario.percentChange.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'targets' && (
            <div>
              <h2 style={{
                fontSize: '20px',
                color: colors.goldMain,
                margin: '0 0 30px 0',
                fontWeight: '700',
              }}>
                🎪 目标分析与建议
              </h2>

              {/* 改进建议卡片 */}
              <div style={{
                    background: `rgba(255, 255, 255, 0.08)`,
                    backdropFilter: 'blur(15px)',
                    border: `1px solid ${colors.goldMain}`,
                    borderRadius: '8px',
                    padding: '30px',
                    marginBottom: '30px',
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      color: colors.goldMain,
                      margin: '0 0 20px 0',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      💡 改进建议
                    </h3>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '20px',
                    }}>
                      <div style={{
                        background: `rgba(176, 155, 123, 0.1)`,
                        borderRadius: '8px',
                        padding: '20px',
                        borderLeft: `4px solid ${colors.goldMain}`,
                      }}>
                        <h4 style={{
                          fontSize: '12px',
                          color: colors.goldMain,
                          margin: '0 0 10px 0',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                        }}>
                          🎯 当前毛利率
                        </h4>
                        <p style={{ margin: 0, color: colors.white, fontSize: '14px' }}>
                          {(targetRecs?.currentMarginPct ?? analysis.metrics.margin_pct).toFixed(2)}%
                        </p>
                      </div>

                      <div style={{
                        background: `rgba(176, 155, 123, 0.1)`,
                        borderRadius: '8px',
                        padding: '20px',
                        borderLeft: `4px solid ${colors.goldSecondary}`,
                      }}>
                        <h4 style={{
                          fontSize: '12px',
                          color: colors.goldSecondary,
                          margin: '0 0 10px 0',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                        }}>
                          🎯 推荐目标
                        </h4>
                        <p style={{ margin: 0, color: colors.white, fontSize: '14px' }}>
                          {(targetRecs?.recommendedTarget ?? Math.round(analysis.metrics.margin_pct + 5)).toLocaleString()}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 成本分析 */}
                  <div style={{
                    background: `rgba(255, 255, 255, 0.08)`,
                    backdropFilter: 'blur(15px)',
                    border: `1px solid ${colors.goldMain}`,
                    borderRadius: '8px',
                    padding: '30px',
                    marginBottom: '30px',
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      color: colors.goldMain,
                      margin: '0 0 20px 0',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}>
                      💰 成本分析
                    </h3>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '20px',
                    }}>
                      <div style={{
                        background: `rgba(255, 107, 107, 0.15)`,
                        border: `1px solid rgba(255, 107, 107, 0.3)`,
                        borderRadius: '8px',
                        padding: '20px',
                        textAlign: 'center',
                      }}>
                        <div style={{
                          fontSize: '12px',
                          color: colors.textSecondary,
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          fontWeight: '600',
                        }}>
                          最高成本单位
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: colors.white,
                          fontWeight: '700',
                          marginBottom: '4px',
                        }}>
                          {costAnalysis?.highestCostPerUnit?.productName || analysis.products[0]?.product_name || 'N/A'}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#ff6b6b',
                          fontWeight: '600',
                        }}>
                          ¥{(costAnalysis?.highestCostPerUnit?.cost ?? analysis.products[0]?.cost ?? 0).toFixed(2)}
                        </div>
                      </div>

                      <div style={{
                        background: `rgba(81, 207, 102, 0.15)`,
                        border: `1px solid rgba(81, 207, 102, 0.3)`,
                        borderRadius: '8px',
                        padding: '20px',
                        textAlign: 'center',
                      }}>
                        <div style={{
                          fontSize: '12px',
                          color: colors.textSecondary,
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          fontWeight: '600',
                        }}>
                          最低成本单位
                        </div>
                        <div style={{
                            fontSize: '14px',
                            color: colors.white,
                            fontWeight: '700',
                            marginBottom: '4px',
                          }}>
                            {costAnalysis?.lowestCostPerUnit?.productName || analysis.products[analysis.products.length-1]?.product_name || 'N/A'}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#51cf66',
                            fontWeight: '600',
                          }}>
                            ¥{(costAnalysis?.lowestCostPerUnit?.cost ?? analysis.products[analysis.products.length-1]?.cost ?? 0).toFixed(2)}
                          </div>
                        </div>

                        <div style={{
                          background: `rgba(176, 155, 123, 0.15)`,
                          border: `1px solid ${colors.goldMain}`,
                          borderRadius: '8px',
                          padding: '20px',
                          textAlign: 'center',
                        }}>
                          <div style={{
                            fontSize: '12px',
                            color: colors.textSecondary,
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>
                            最高总成本
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: colors.white,
                            fontWeight: '700',
                            marginBottom: '4px',
                          }}>
                            {costAnalysis?.highestTotalCost?.productName || analysis.products[0]?.product_name || 'N/A'}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: colors.goldMain,
                            fontWeight: '600',
                          }}>
                            ¥{Math.round(costAnalysis?.highestTotalCost?.totalCost ?? analysis.products[0]?.cost * analysis.products[0]?.sales_volume ?? 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
            </div>
          )}
        </div>
      </main>

      {/* 底部操作栏 */}
      <div style={{
        background: `rgba(0, 37, 40, 0.7)`,
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid rgba(176, 155, 123, 0.2)`,
        padding: '20px 40px 20px 50px',
        display: 'flex',
        gap: '15px',
        justifyContent: 'flex-end',
      }}>

        <button
          onClick={() => {
            setAnalysis(null);
            setUploadedFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          style={{
            padding: '10px 24px',
            background: `rgba(255, 255, 255, 0.1)`,
            color: colors.white,
            border: `1px solid ${colors.goldMain}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '12px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `rgba(255, 255, 255, 0.15)`;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `rgba(255, 255, 255, 0.1)`;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ↺ 重新分析
        </button>
      </div>

      {/* 隐藏的PDF报告内容 */}
      <div id="report-content" style={{ display: 'none' }}>
        <div style={{ padding: '40px', background: 'white', color: '#333', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ color: '#002528', borderBottom: '3px solid #002528', paddingBottom: '20px' }}>
            产品毛利率分析报告
          </h1>
          <p style={{ color: '#b09b7b', fontSize: '12px' }}>
            生成时间: {new Date().toLocaleString()}
          </p>

          <h2 style={{ color: '#002528', marginTop: '30px', marginBottom: '20px' }}>关键指标</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>总毛利</td>
              <td style={{ padding: '10px', color: '#b09b7b', fontWeight: 'bold' }}>
                ¥{Math.round(analysis.metrics.total_margin).toLocaleString()}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>平均毛利率</td>
              <td style={{ padding: '10px', color: '#b09b7b', fontWeight: 'bold' }}>
                {analysis.metrics.avg_margin_pct.toFixed(2)}%
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>综合毛利率</td>
              <td style={{ padding: '10px', color: '#b09b7b', fontWeight: 'bold' }}>
                {analysis.metrics.margin_pct.toFixed(2)}%
              </td>
            </tr>
            <tr>
              <td style={{ padding: '10px', fontWeight: 'bold' }}>总销售量</td>
              <td style={{ padding: '10px', color: '#b09b7b', fontWeight: 'bold' }}>
                {analysis.metrics.total_units}
              </td>
            </tr>
          </table>

          <h2 style={{ color: '#002528', marginTop: '30px', marginBottom: '20px' }}>产品详情</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #002528' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>产品名称</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>分类</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>成本</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>价格</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>销量</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>毛利率</th>
                <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>总毛利</th>
              </tr>
            </thead>
            <tbody>
              {analysis.products.slice(0, 20).map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #ddd', background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                  <td style={{ padding: '10px' }}>{p.product_name}</td>
                  <td style={{ padding: '10px' }}>{p.category}</td>
                  <td style={{ padding: '10px' }}>¥{p.cost.toFixed(2)}</td>
                  <td style={{ padding: '10px' }}>¥{p.price.toFixed(2)}</td>
                  <td style={{ padding: '10px' }}>{p.sales_volume}</td>
                  <td style={{ padding: '10px', color: '#b09b7b', fontWeight: 'bold' }}>
                    {p.gross_margin_pct}%
                  </td>
                  <td style={{ padding: '10px', color: '#b09b7b', fontWeight: 'bold' }}>
                    ¥{Math.round(p.total_margin).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        ::-webkit-scrollbar-thumb {
          background: #b09b7b;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #9a8a6e;
        }
      `}</style>
    </div>
  );
}
