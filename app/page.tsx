'use client';

import { useState, useRef, useEffect } from 'react';

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
      setAnalysis({
        products: data.products || [],
        metrics: data.metrics || {},
      });
    } catch (error) {
      alert('分析失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsLoading(false);
    }
  };

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
          {!analysis ? (
            // 上传界面
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
          ) : (
            // 分析结果界面
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
                  { label: '平均毛利率', value: `${analysis.metrics.avg_margin_pct}%`, icon: '📈', color: colors.goldMain },
                  { label: '综合毛利率', value: `${analysis.metrics.margin_pct}%`, icon: '📊', color: colors.goldSecondary },
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

              {/* 产品表格 */}
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

              {/* 重新分析按钮 */}
              <button
                onClick={() => {
                  setAnalysis(null);
                  setUploadedFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                style={{
                  marginTop: '30px',
                  padding: '12px 30px',
                  background: `linear-gradient(135deg, ${colors.goldMain}, ${colors.goldSecondary})`,
                  color: colors.darkBg1,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 8px 16px rgba(176, 155, 123, 0.3)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                ↺ 重新分析
              </button>
            </div>
          )}
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
