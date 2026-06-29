import { NextRequest, NextResponse } from 'next/server';
import { readExcel, detectProductSheet } from '@/lib/excel-parser';
import { analyzeProducts, calculateMetrics } from '@/lib/margin-calculator';
import type { AnalysisData } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files' }, { status: 400 });
    }

    const analysisData: AnalysisData = {
      id: Math.floor(Math.random() * 10000),
      timestamp: new Date().toISOString(),
      products: [],
      metrics: { total_revenue: 0, total_cost: 0, total_margin: 0, avg_margin_pct: 0, margin_pct: 0, total_units: 0, highest_margin_product: '', lowest_margin_product: '' },
      financials: {},
    };

    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const excelData = readExcel(buffer);

      for (const [sheetName, sheetData] of Object.entries(excelData)) {
        if (!sheetData || sheetData.length === 0) continue;

        if (detectProductSheet(sheetName)) {
          const products = analyzeProducts(sheetData as unknown[][]);
          if (products.length > 0) {
            analysisData.products = products;
            analysisData.metrics = calculateMetrics(products);
          }
        }
      }
    }

    return NextResponse.json(analysisData, { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
