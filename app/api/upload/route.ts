import { NextRequest, NextResponse } from 'next/server';
import { readExcel, detectProductSheet } from '@/lib/excel-parser';
import { analyzeProducts, calculateMetrics } from '@/lib/margin-calculator';
import { PrismaClient } from '@prisma/client';
import type { AnalysisData } from '@/lib/types';

const prisma = new PrismaClient();

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

    // Save to database
    const savedAnalysis = await prisma.analysis.create({
      data: {
        status: 'completed',
        data: JSON.stringify(analysisData),
        products: {
          create: analysisData.products.map(p => ({
            productId: p.product_id,
            productName: p.product_name,
            category: p.category,
            cost: p.cost,
            price: p.price,
            salesVolume: p.sales_volume,
            grossMarginPct: p.gross_margin_pct,
            grossMarginAbs: p.gross_margin_abs,
            totalMargin: p.total_margin,
          })),
        },
      },
      include: {
        products: true,
      },
    });

    // Return with analysisId for future reference
    return NextResponse.json({
      ...analysisData,
      analysisId: savedAnalysis.id,
    }, { status: 200 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
