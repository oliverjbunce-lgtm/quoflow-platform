export class IntegrationAdapter {
  constructor(config = {}) {
    this.config = config
  }
  async connect(credentials) { throw new Error('not implemented') }
  async exportQuote(quote) { throw new Error('not implemented') }
  async exportOrder(order) { throw new Error('not implemented') }
  async disconnect() { throw new Error('not implemented') }
  async testConnection() { throw new Error('not implemented') }
}
