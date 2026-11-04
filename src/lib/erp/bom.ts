// BOM 다단계 전개 — 루트 직하부터 깊이우선. 소요량은 부모×자식 누적. 순환은 조상집합으로 차단.
export type BomLine = { parentId: string; childId: string; qty: number }
export type ExpandedLine = { materialId: string; qty: number; level: number }

// parent→child 간선을 추가하면 순환이 생기는가? (child가 이미 parent에 도달 가능하거나 자기참조)
export function wouldCycle(parentId: string, childId: string, lines: BomLine[]): boolean {
  if (parentId === childId) return true
  return expandBom(childId, lines).some((e) => e.materialId === parentId)
}

export function expandBom(
  rootId: string,
  lines: BomLine[],
  qtyMult = 1,
  level = 1,
  ancestors: Set<string> = new Set(),
): ExpandedLine[] {
  const out: ExpandedLine[] = []
  for (const line of lines) {
    if (line.parentId !== rootId) continue
    if (ancestors.has(line.childId)) continue // 순환 차단
    const qty = qtyMult * line.qty
    out.push({ materialId: line.childId, qty, level })
    out.push(...expandBom(line.childId, lines, qty, level + 1, new Set([...ancestors, rootId])))
  }
  return out
}
