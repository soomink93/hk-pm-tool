import { describe, it, expect } from 'vitest'
import { can, visibleTabs, canEditProject } from './rbac'

describe('can', () => {
  it('decision:write full editors + executive; teamlead cannot', () => {
    expect(can('executive', 'decision:write')).toBe(true)
    expect(can('chairman', 'decision:write')).toBe(true) // 전체 편집자
    expect(can('teamlead', 'decision:write')).toBe(false)
  })
  it('escalation:write full editors + executive + teamlead', () => {
    expect(can('executive', 'escalation:write')).toBe(true)
    expect(can('teamlead', 'escalation:write')).toBe(true)
    expect(can('chairman', 'escalation:write')).toBe(true) // 전체 편집자
  })
  it('user:manage full editors only', () => {
    expect(can('chairman', 'user:manage')).toBe(true)
    expect(can('executive', 'user:manage')).toBe(false)
    expect(can('teamlead', 'user:manage')).toBe(false)
  })
  it('decision:view chairman and executive only', () => {
    expect(can('chairman', 'decision:view')).toBe(true)
    expect(can('executive', 'decision:view')).toBe(true)
    expect(can('teamlead', 'decision:view')).toBe(false)
  })
})

describe('visibleTabs', () => {
  it('teamlead has no decisions tab', () => {
    expect(visibleTabs('teamlead')).not.toContain('decisions')
  })
  it('chairman has decisions tab', () => {
    expect(visibleTabs('chairman')).toContain('decisions')
  })
  it('all roles have overview', () => {
    expect(visibleTabs('teamlead')).toContain('overview')
    expect(visibleTabs('executive')).toContain('overview')
    expect(visibleTabs('chairman')).toContain('overview')
  })
})

describe('canEditProject', () => {
  it('full editors can edit any project', () => {
    expect(canEditProject('admin', 'u1', 'u2')).toBe(true)
    expect(canEditProject('chairman', null, 'u2')).toBe(true)
  })
  it('owner can edit own project', () => {
    expect(canEditProject('teamlead', 'u2', 'u2')).toBe(true)
  })
  it('non-owner non-full cannot edit', () => {
    expect(canEditProject('teamlead', 'u1', 'u2')).toBe(false)
    expect(canEditProject('executive', 'u1', 'u2')).toBe(false)
  })
})
