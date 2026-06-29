import { read } from 'xlsx';

export function readExcel(buffer: ArrayBuffer): Record<string, unknown[][]> {
  const workbook = read(buffer, { type: 'array' });
  const data: Record<string, unknown[][]> = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rows: unknown[][] = [];
    let row = 1;
    let hasData = true;

    while (hasData) {
      const rowData: unknown[] = [];
      let colHasData = false;

      for (let col = 0; col < 20; col++) {
        const cellAddress = String.fromCharCode(65 + col) + row;
        const cell = worksheet[cellAddress];

        if (cell?.v !== undefined) {
          rowData.push(cell.v);
          colHasData = true;
        } else {
          rowData.push(null);
        }
      }

      if (colHasData) {
        rows.push(rowData);
        row++;
      } else {
        hasData = false;
      }
    }

    if (rows.length > 0) {
      data[sheetName] = rows;
    }
  }

  return data;
}

export function detectProductSheet(sheetName: string): boolean {
  const productKeywords = ['产品', 'product', 'products', '产品表'];
  return productKeywords.some((keyword) => sheetName.toLowerCase().includes(keyword));
}

export function detectFinancialSheet(sheetName: string): Record<string, boolean> {
  const pnlKeywords = ['损益', 'p&l', 'pnl', 'income', '利润'];
  const balanceKeywords = ['资产', 'balance', '负债表'];
  const cashflowKeywords = ['现金', 'cash', 'cashflow'];

  return {
    isPnL: pnlKeywords.some((keyword) => sheetName.toLowerCase().includes(keyword)),
    isBalance: balanceKeywords.some((keyword) => sheetName.toLowerCase().includes(keyword)),
    isCashflow: cashflowKeywords.some((keyword) => sheetName.toLowerCase().includes(keyword)),
  };
}
