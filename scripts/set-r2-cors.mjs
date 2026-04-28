#!/usr/bin/env node
/**
 * One-time script: sets CORS policy on the R2 bucket so browser uploads work.
 * Run: node scripts/set-r2-cors.mjs
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'

const envRaw = readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8')
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME || 'photohub'

const corsConfig = {
  CORSRules: [
    {
      AllowedOrigins: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 86400,
    },
  ],
}

try {
  await s3.send(new PutBucketCorsCommand({ Bucket: BUCKET, CORSConfiguration: corsConfig }))
  console.log(`✓ CORS configured on bucket: ${BUCKET}`)

  const { CORSRules } = await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }))
  console.log('Active rules:', JSON.stringify(CORSRules, null, 2))
} catch (err) {
  console.error('Failed:', err.message)
  process.exit(1)
}
