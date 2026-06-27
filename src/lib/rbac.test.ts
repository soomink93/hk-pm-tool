import { describe, it, expect } from 'vitest'
import { can, visibleTabs } from './rbac'

describe('can', () => {
  it('executive can write kpi, others cannot', () => {
    expect(can('executive', 'kpi:write')).toBe(true)
    expect(can('chairman', 'kpi:write')).toBe(false)
    expect(can('teamlead', 'kpi:write')).toBe(false)
  })
  it('decision:write executive only; chairman read-only', () => {
    expect(can('executive', 'decision:write')).toBe(true)
    expect(can('chairman', 'decision:write')).toBe(false)
    expect(can('teamlead', 'decision:write')).toBe(false)
  })
  it('escalation:write executive and teamlead', () => {
    expect(can('executive', 'escalation:write')).toBe(true)
    expect(can('teamlead', 'escalation:write')).toBe(true)
    expect(can('chairman', 'escalation:write')).toBe(false)
  })
  it('user:manage chairman and executive', () => {
    expect(can('chairman', 'user:manage')).toBe(true)
    expect(can('executive', 'user:manage')).toBe(true)
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
