jest.mock('../../common/gcsClient', () => ({
  uploadJSON: jest.fn(),
  listFiles: jest.fn(),
  deleteFiles: jest.fn(),
  downloadJSON: jest.fn(),
}))
jest.mock('../../common/siteConfig', () => ({
  writeSiteConfig: jest.fn(),
  writePublishedSiteConfig: jest.fn(),
}))
jest.mock('../../common/gcsUser', () => ({
  getUserHistoryPrefix: (u) => `users/${u}/history/`,
  getUserHistoryPath: (u, ts) => `users/${u}/history/site-config-${ts}.json`,
}))

import { uploadJSON, listFiles, deleteFiles } from '../../common/gcsClient'
import { writeSiteConfig, writePublishedSiteConfig } from '../../common/siteConfig'
import { publishSiteConfig, pruneHistory } from '../../common/publishConfig'

describe('publishSiteConfig', () => {
  beforeEach(() => {
    uploadJSON.mockReset(); listFiles.mockReset(); deleteFiles.mockReset()
    writeSiteConfig.mockReset(); writePublishedSiteConfig.mockReset()
    listFiles.mockResolvedValue([])
  })

  it('writes draft and published with the same timestamp and a snapshot', async () => {
    const spy = jest.spyOn(Date, 'now').mockReturnValue(500)
    const cfg = { pages: [] }
    const res = await publishSiteConfig('u1', cfg)
    expect(res).toEqual({ publishedAt: 500 })
    expect(writeSiteConfig).toHaveBeenCalledWith('u1', cfg, { updatedAt: 500 })
    expect(writePublishedSiteConfig).toHaveBeenCalledWith('u1', cfg, 500)
    expect(uploadJSON).toHaveBeenCalledWith('users/u1/history/site-config-500.json', cfg)
    spy.mockRestore()
  })
})

describe('pruneHistory', () => {
  beforeEach(() => { listFiles.mockReset(); deleteFiles.mockReset() })

  it('keeps the newest N and deletes older publish snapshots', async () => {
    // listFiles (common/gcsClient) returns an array of plain Key strings, not
    // objects — see gcsClient.js listFiles/listFilesWithEtags for the split.
    const keys = Array.from({ length: 23 }, (_, i) => `users/u1/history/site-config-${1000 + i}.json`)
    // include an autosave file that must be ignored by publish prune
    listFiles.mockResolvedValue([...keys, 'users/u1/history/autosave/site-config-1.json'])
    await pruneHistory('u1', 20)
    const deleted = deleteFiles.mock.calls[0][0]
    expect(deleted).toHaveLength(3)
    expect(deleted).toEqual(expect.arrayContaining([
      'users/u1/history/site-config-1000.json',
      'users/u1/history/site-config-1001.json',
      'users/u1/history/site-config-1002.json',
    ]))
    expect(deleted).not.toContain('users/u1/history/autosave/site-config-1.json')
  })

  it('does nothing when at or under the cap', async () => {
    listFiles.mockResolvedValue(['users/u1/history/site-config-1000.json'])
    await pruneHistory('u1', 20)
    expect(deleteFiles).not.toHaveBeenCalled()
  })
})
