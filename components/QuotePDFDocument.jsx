import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  logo: { height: 48, marginBottom: 8, objectFit: 'contain' },
  companyName: { fontSize: 20, fontWeight: 'bold', color: '#1c1c1e' },
  companyDetails: { fontSize: 9, color: '#8e8e93', marginTop: 4, lineHeight: 1.5 },
  quoteTitle: { fontSize: 24, fontWeight: 'bold', color: '#0A84FF', textAlign: 'right' },
  quoteNumber: { fontSize: 11, color: '#8e8e93', textAlign: 'right', marginTop: 2 },
  section: { marginBottom: 24 },
  label: { fontSize: 8, fontWeight: 'bold', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  clientName: { fontSize: 14, fontWeight: 'bold', color: '#1c1c1e' },
  table: { marginTop: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f2f2f7', padding: '8 12', borderRadius: 6, marginBottom: 2 },
  tableHeaderText: { fontSize: 9, fontWeight: 'bold', color: '#8e8e93', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', padding: '10 12', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tableCell: { fontSize: 10, color: '#1c1c1e' },
  totalsSection: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: 200, marginBottom: 6 },
  totalLabel: { fontSize: 10, color: '#8e8e93' },
  totalValue: { fontSize: 10, color: '#1c1c1e' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', width: 200, backgroundColor: '#0A84FF', padding: '8 12', borderRadius: 8, marginTop: 4 },
  grandTotalLabel: { fontSize: 12, fontWeight: 'bold', color: '#ffffff' },
  grandTotalValue: { fontSize: 12, fontWeight: 'bold', color: '#ffffff' },
  footer: { position: 'absolute', bottom: 32, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#8e8e93' },
})

export default function QuotePDFDocument({ quote, tenant }) {
  const settings = JSON.parse(tenant?.settings_json || '{}')
  const items = JSON.parse(quote?.items_json || '[]')
  const quoteDate = new Date((quote?.created_at || 0) * 1000).toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {tenant?.logo_url && (
              <Image src={tenant.logo_url} style={styles.logo} />
            )}
            <Text style={styles.companyName}>{tenant?.name || 'Company'}</Text>
            <Text style={styles.companyDetails}>
              {[settings.address, settings.phone, settings.email].filter(Boolean).join('\n')}
            </Text>
          </View>
          <View>
            <Text style={styles.quoteTitle}>QUOTE</Text>
            <Text style={styles.quoteNumber}>{quote?.id}</Text>
            <Text style={[styles.quoteNumber, { marginTop: 4 }]}>{quoteDate}</Text>
          </View>
        </View>

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.label}>Prepared For</Text>
          <Text style={styles.clientName}>{quote?.client_name || 'Client'}</Text>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 3 }]}>Description</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <View style={{ flex: 3 }}>
                <Text style={styles.tableCell}>{item.name || item.type || item.class_name || 'Item'}</Text>
                {item.specs && (
                  <Text style={[styles.tableCell, { fontSize: 8, color: '#8e8e93', marginTop: 2 }]}>{item.specs}</Text>
                )}
              </View>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.qty || 1}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                ${Number(item.unit_price || item.price || 0).toFixed(2)}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                ${((item.qty || 1) * (item.unit_price || item.price || 0)).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>${Number(quote?.subtotal || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST (15%)</Text>
            <Text style={styles.totalValue}>${Number(quote?.gst || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total (NZD)</Text>
            <Text style={styles.grandTotalValue}>${Number(quote?.total || 0).toFixed(2)}</Text>
          </View>
        </View>

        {/* Notes */}
        {quote?.notes && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={{ fontSize: 10, color: '#1c1c1e', lineHeight: 1.6 }}>{quote.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Quote valid for 30 days from date of issue</Text>
          <Text style={styles.footerText}>Generated by Quoflow · quoflow.co.nz</Text>
        </View>
      </Page>
    </Document>
  )
}
