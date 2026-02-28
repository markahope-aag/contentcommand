/**
 * Health check utilities for external integrations
 */

import { dataForSEO } from './dataforseo'
import { frase } from './frase'
import { getOrganizations } from './llmrefs'

export interface IntegrationHealth {
  provider: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  last_check: string
  error?: string
  response_time?: number
}

export async function checkIntegrationHealth(): Promise<IntegrationHealth[]> {
  const healthChecks = await Promise.allSettled([
    checkDataForSEOHealth(),
    checkFraseHealth(),
    checkLLMRefsHealth(),
  ])

  return healthChecks.map((result, index) => {
    const providers = ['dataforseo', 'frase', 'llmrefs']
    const provider = providers[index]

    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        provider,
        status: 'unhealthy' as const,
        last_check: new Date().toISOString(),
        error: result.reason?.message || 'Unknown error',
      }
    }
  })
}

async function checkDataForSEOHealth(): Promise<IntegrationHealth> {
  const startTime = Date.now()
  
  try {
    // Simple health check - could be a lightweight API call
    await dataForSEO.getDomainMetrics('example.com', 'health-check')
    
    return {
      provider: 'dataforseo',
      status: 'healthy',
      last_check: new Date().toISOString(),
      response_time: Date.now() - startTime,
    }
  } catch (error: unknown) {
    return {
      provider: 'dataforseo',
      status: 'unhealthy',
      last_check: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time: Date.now() - startTime,
    }
  }
}

async function checkFraseHealth(): Promise<IntegrationHealth> {
  const startTime = Date.now()
  
  try {
    // Simple health check
    await frase.analyzeSerp('test query', 'health-check')
    
    return {
      provider: 'frase',
      status: 'healthy',
      last_check: new Date().toISOString(),
      response_time: Date.now() - startTime,
    }
  } catch (error: unknown) {
    return {
      provider: 'frase',
      status: 'unhealthy',
      last_check: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time: Date.now() - startTime,
    }
  }
}

async function checkLLMRefsHealth(): Promise<IntegrationHealth> {
  const startTime = Date.now()
  
  try {
    // Simple health check
    await getOrganizations()
    
    return {
      provider: 'llmrefs',
      status: 'healthy',
      last_check: new Date().toISOString(),
      response_time: Date.now() - startTime,
    }
  } catch (error: unknown) {
    return {
      provider: 'llmrefs',
      status: 'unhealthy',
      last_check: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      response_time: Date.now() - startTime,
    }
  }
}