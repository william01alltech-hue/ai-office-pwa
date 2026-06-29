import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Node } from 'prosemirror-model';
import { TableMap } from '@tiptap/pm/tables';

export function indexToCol(index: number): string {
  let col = '';
  let temp = index;
  while (temp >= 0) {
    col = String.fromCharCode((temp % 26) + 65) + col;
    temp = Math.floor(temp / 26) - 1;
  }
  return col;
}

export function getCellSelectionRange(selection: any, tableNode: Node, tableStartPos: number): string | null {
  try {
    if (!selection.isCellSelection) return null;
    const map = TableMap.get(tableNode);
    const anchorOffset = selection.$anchorCell.pos - tableStartPos;
    const headOffset = selection.$headCell.pos - tableStartPos;
    
    const rect = map.rectBetween(anchorOffset, headOffset);
    const startCol = indexToCol(rect.left);
    const startRow = rect.top + 1;
    const endCol = indexToCol(rect.right - 1);
    const endRow = rect.bottom;
    
    if (startCol === endCol && startRow === endRow) {
      return `${startCol}${startRow}`;
    }
    return `${startCol}${startRow}:${endCol}${endRow}`;
  } catch (e) {
    console.error(e);
    return null;
  }
}


// 解析欄位名稱 (A, B, C...) 轉為索引 (0, 1, 2...)
function colToIndex(col: string): number {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 64);
  }
  return index - 1;
}

// 解析座標 (例如 A1) 轉為 { r, c } (0-indexed)
function parseCoord(coord: string): { r: number, c: number } | null {
  const match = coord.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return {
    c: colToIndex(match[1]),
    r: parseInt(match[2], 10) - 1,
  };
}

// 取得範圍的所有儲存格座標 (例如 A1:B2)
function getRangeCoords(rangeStr: string): { r: number, c: number }[] {
  const [start, end] = rangeStr.split(':');
  if (!start) return [];
  const startCoord = parseCoord(start);
  if (!startCoord) return [];
  
  if (!end) return [startCoord]; // 單一儲存格
  
  const endCoord = parseCoord(end);
  if (!endCoord) return [startCoord];

  const coords = [];
  for (let r = Math.min(startCoord.r, endCoord.r); r <= Math.max(startCoord.r, endCoord.r); r++) {
    for (let c = Math.min(startCoord.c, endCoord.c); c <= Math.max(startCoord.c, endCoord.c); c++) {
      coords.push({ r, c });
    }
  }
  return coords;
}

// 簡單的公式引擎
function evaluateFormula(formula: string, matrix: string[][]): string {
  try {
    const f = formula.trim().toUpperCase();
    if (!f.startsWith('=')) return formula;

    const core = f.substring(1).trim();

    // 處理 SUM(A1:A3)
    if (core.startsWith('SUM(') && core.endsWith(')')) {
      const range = core.slice(4, -1);
      const coords = getRangeCoords(range);
      let sum = 0;
      for (const { r, c } of coords) {
        if (matrix[r] && matrix[r][c]) {
          const val = parseFloat(matrix[r][c].replace(/,/g, ''));
          if (!isNaN(val)) sum += val;
        }
      }
      return sum.toString();
    }

    // 處理 AVERAGE(A1:A3)
    if (core.startsWith('AVERAGE(') && core.endsWith(')')) {
      const range = core.slice(8, -1);
      const coords = getRangeCoords(range);
      let sum = 0;
      let count = 0;
      for (const { r, c } of coords) {
        if (matrix[r] && matrix[r][c]) {
          const val = parseFloat(matrix[r][c].replace(/,/g, ''));
          if (!isNaN(val)) {
            sum += val;
            count++;
          }
        }
      }
      return count === 0 ? '0' : (sum / count).toString();
    }

    // 處理簡單加減乘除，例如 =A1+B1 (非常簡易的實作)
    // 為了安全，不使用 eval，這裡只實作基礎替換與計算
    // 如果有複雜的公式，建議使用更強大的 parser
    let mathExpr = core;
    const cellRegex = /[A-Z]+\d+/g;
    const matches = core.match(cellRegex);
    if (matches) {
      for (const match of matches) {
        const coord = parseCoord(match);
        if (coord && matrix[coord.r] && matrix[coord.r][coord.c] !== undefined) {
           let cellVal = matrix[coord.r][coord.c];
           if (cellVal.trim() === '') cellVal = '0';
           mathExpr = mathExpr.replace(match, cellVal);
        } else {
           mathExpr = mathExpr.replace(match, '0');
        }
      }
    }
    
    // 只有數字與基礎運算符號才計算
    if (/^[\d.+\-*/\s()]+$/.test(mathExpr)) {
      const result = new Function(`return ${mathExpr}`)();
      if (!isNaN(result)) return result.toString();
    }

    return formula; // 無法計算則原樣回傳
  } catch (e) {
    console.error('Formula evaluation error:', e);
    return '#ERROR!';
  }
}

export const ReactiveTablePlugin = Extension.create({
  name: 'reactiveTablePlugin',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('reactiveTable'),
        appendTransaction(transactions, _oldState, newState) {
          // 如果沒有文檔變更，就不處理
          if (!transactions.some(tr => tr.docChanged)) {
            return null;
          }

          let tr = newState.tr;
          let modified = false;

          // 走訪整份文件找尋 table
          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'table') {
              // 建立此表格的虛擬矩陣
              const matrix: string[][] = [];
              const cellNodes: { node: Node, pos: number, r: number, c: number }[] = [];

              let r = 0;
              node.forEach((rowNode, rowOffset) => {
                if (rowNode.type.name === 'tableRow') {
                  const rowData: string[] = [];
                  let c = 0;
                  rowNode.forEach((cellNode, cellOffset) => {
                    const content = cellNode.textContent;
                    rowData.push(content);
                    // 記錄所有儲存格的 Node 與其絕對位置
                    cellNodes.push({
                      node: cellNode,
                      pos: pos + 1 + rowOffset + 1 + cellOffset,
                      r,
                      c
                    });
                    c++;
                  });
                  matrix.push(rowData);
                  r++;
                }
              });

              // 再次走訪所有儲存格，如果有 formula 屬性，就進行計算並更新 text
              for (const cellInfo of cellNodes) {
                const formula = cellInfo.node.attrs.formula;
                
                // 已經具有 formula 屬性的儲存格才進行連動計算
                if (formula) {
                  // 如果已經有 formula，重新計算看是否需要更新結果
                  const result = evaluateFormula(formula, matrix);
                  if (result !== cellInfo.node.textContent) {
                    const cellStart = cellInfo.pos + 1;
                    const cellEnd = cellStart + cellInfo.node.content.size;
                    const pNode = newState.schema.nodes.paragraph.create(null, newState.schema.text(result));
                    tr = tr.replaceWith(cellStart, cellEnd, pNode);
                    modified = true;
                    matrix[cellInfo.r][cellInfo.c] = result;
                  }
                }
              }
              
              return false; // 不需要再往下進入 table 內部
            }
          });

          if (modified) {
            // 加上一個 meta 避免某些情況無限迴圈
            tr.setMeta('reactiveTable', true);
            return tr;
          }
          return null;
        },
      }),
    ];
  },
});
