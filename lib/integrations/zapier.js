import { IntegrationAdapter } from './base.js'

export class ZapierAdapter extends IntegrationAdapter {
  constructor(config = {}) {
    super(config)
    this.webhookUrl = config.webhook_url
  }

  async connect(credentials) {
    if (!credentials.webhook_url) throw new Error('Webhook URL required')
    this.webhookUrl = credentials.webhook_url
    // Test the webhook
    await this.sendEvent('connection_test', { message: 'Quoflow connected successfully' })
    return { success: true }
  }

  async sendEvent(eventType, data) {
    if (!this.webhookUrl) throw new Error('No webhook URL configured')
    const res = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), data }),
    })
    if (!res.ok) throw new Error(`Webhook failed: ${res.status}`)
    return { success: true }
  }

  async exportQuote(quote) {
    return this.sendEvent('quote_created', quote)
  }

  async exportOrder(order) {
    return this.sendEvent('order_created', order)
  }

  async disconnect() {
    this.webhookUrl = null
    return { success: true }
  }

  async testConnection() {
    return this.sendEvent('ping', {})
  }
}
