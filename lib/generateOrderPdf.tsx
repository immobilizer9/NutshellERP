// lib/generateOrderPdf.tsx
import {
  Document, Page, Text, View, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

const PRODUCT_LABELS: Record<string, string> = {
  ANNUAL:            "Annual",
  PAPERBACKS_PLAINS: "Paperbacks (Plains)",
  PAPERBACKS_HILLS:  "Paperbacks (Hills)",
};

const s = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1a1a1a", backgroundColor: "#fff" },
  header:      { marginBottom: 22, borderBottom: "1.5 solid #6366f1", paddingBottom: 12 },
  brand:       { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#6366f1", letterSpacing: 1 },
  brandSub:    { fontSize: 8.5, color: "#6b7280", marginTop: 2, letterSpacing: 0.5 },
  orderTitle:  { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 5, color: "#111118" },
  orderId:     { fontSize: 8, color: "#9ca3af", marginTop: 2 },
  section:     { marginBottom: 14 },
  sectionTitle:{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#6366f1", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, borderBottom: "0.5 solid #e4e4e7", paddingBottom: 3 },
  twoCol:      { flexDirection: "row", gap: 14 },
  col:         { flex: 1 },
  row:         { flexDirection: "row", marginBottom: 3 },
  label:       { width: 90, color: "#6b7280", fontSize: 9 },
  value:       { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111118" },
  table:       { width: "100%", marginTop: 4 },
  tHead:       { flexDirection: "row", backgroundColor: "#f4f4f5", padding: "5 8", borderRadius: 3 },
  tRow:        { flexDirection: "row", padding: "4 8", borderBottom: "0.5 solid #f0f0f2" },
  tRowAlt:     { flexDirection: "row", padding: "4 8", borderBottom: "0.5 solid #f0f0f2", backgroundColor: "#fafafa" },
  thClass:     { width: "22%", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#6b7280" },
  thNum:       { width: "13%", fontSize: 8, fontFamily: "Helvetica-Bold", color: "#6b7280", textAlign: "right" },
  tdClass:     { width: "22%", fontSize: 9 },
  tdNum:       { width: "13%", fontSize: 9, textAlign: "right" },
  tdMuted:     { width: "13%", fontSize: 9, textAlign: "right", color: "#9ca3af" },
  tdBold:      { width: "13%", fontSize: 9, textAlign: "right", fontFamily: "Helvetica-Bold" },
  totalRow:    { flexDirection: "row", padding: "6 8", backgroundColor: "#eef2ff", borderRadius: 3, marginTop: 2 },
  totalLabel:  { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold", color: "#4338ca" },
  totalValue:  { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#4338ca" },
  footer:      { position: "absolute", bottom: 26, left: 40, right: 40, borderTop: "0.5 solid #e4e4e7", paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footerText:  { fontSize: 7.5, color: "#9ca3af" },
  infoBox:     { backgroundColor: "#f9f9fb", border: "0.5 solid #e4e4e7", borderRadius: 4, padding: "8 10", marginBottom: 10 },
});

type OrderData = {
  id: string; type: string; productType: string; status: string;
  grossAmount: number; netAmount: number;
  schoolEmail?: string|null; schoolPhone?: string|null;
  address1?: string|null; address2?: string|null; pincode?: string|null;
  orderDate?: Date|string|null; deliveryDate?: Date|string|null;
  createdAt: Date|string;
  vendorName?: string|null; vendorPhone?: string|null;
  vendorEmail?: string|null; vendorAddress?: string|null;
  school:     { name: string; city: string; state: string };
  createdBy:  { name: string; email: string; phone?: string|null };
  items:      { className: string; quantity: number; mrp: number; unitPrice: number; total: number }[];
  pocs:       { role: string; name?: string|null; phone?: string|null; email?: string|null }[];
};

function fmt(n: number) { return `\u20B9${n.toLocaleString("en-IN")}`; }
function fmtDate(d?: Date|string|null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function OrderDoc({ o }: { o: OrderData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>

        <View style={s.header}>
          <Text style={s.brand}>NUTSHELL</Text>
          <Text style={s.brandSub}>GK BOOKS — ORDER CONFIRMATION</Text>
          <Text style={s.orderTitle}>{PRODUCT_LABELS[o.productType] ?? o.productType} Order</Text>
          <Text style={s.orderId}>Order ID: {o.id}</Text>
        </View>

        {/* School + Order Info */}
        <View style={[s.section, s.twoCol]}>
          <View style={s.col}>
            <Text style={s.sectionTitle}>School Details</Text>
            <View style={s.row}><Text style={s.label}>School</Text><Text style={s.value}>{o.school.name}</Text></View>
            <View style={s.row}><Text style={s.label}>City</Text><Text style={s.value}>{o.school.city}, {o.school.state}</Text></View>
            {o.address1 && <View style={s.row}><Text style={s.label}>Address</Text><Text style={s.value}>{o.address1}{o.address2 ? `\n${o.address2}` : ""}{o.pincode ? ` — ${o.pincode}` : ""}</Text></View>}
            {o.schoolPhone && <View style={s.row}><Text style={s.label}>Phone</Text><Text style={s.value}>{o.schoolPhone}</Text></View>}
            {o.schoolEmail && <View style={s.row}><Text style={s.label}>Email</Text><Text style={s.value}>{o.schoolEmail}</Text></View>}
          </View>
          <View style={s.col}>
            <Text style={s.sectionTitle}>Order Info</Text>
            <View style={s.row}><Text style={s.label}>Sales Rep</Text><Text style={s.value}>{o.createdBy.name}</Text></View>
            {o.createdBy.phone && <View style={s.row}><Text style={s.label}>Rep Phone</Text><Text style={s.value}>{o.createdBy.phone}</Text></View>}
            <View style={s.row}><Text style={s.label}>Order Type</Text><Text style={s.value}>{o.type}</Text></View>
            <View style={s.row}><Text style={s.label}>Order Date</Text><Text style={s.value}>{fmtDate(o.orderDate)}</Text></View>
            <View style={s.row}><Text style={s.label}>Delivery Date</Text><Text style={s.value}>{fmtDate(o.deliveryDate)}</Text></View>
          </View>
        </View>

        {/* Vendor Details */}
        {o.vendorName && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Vendor Details</Text>
            <View style={s.infoBox}>
              <View style={s.twoCol}>
                <View style={s.col}>
                  <View style={s.row}><Text style={s.label}>Vendor Name</Text><Text style={s.value}>{o.vendorName}</Text></View>
                  {o.vendorPhone && <View style={s.row}><Text style={s.label}>Phone</Text><Text style={s.value}>{o.vendorPhone}</Text></View>}
                </View>
                <View style={s.col}>
                  {o.vendorEmail && <View style={s.row}><Text style={s.label}>Email</Text><Text style={s.value}>{o.vendorEmail}</Text></View>}
                  {o.vendorAddress && <View style={s.row}><Text style={s.label}>Address</Text><Text style={s.value}>{o.vendorAddress}</Text></View>}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Items Table */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Book Order</Text>
          <View style={s.table}>
            <View style={s.tHead}>
              <Text style={s.thClass}>Class</Text>
              <Text style={s.thNum}>Qty</Text>
              <Text style={s.thNum}>MRP</Text>
              <Text style={s.thNum}>Agreed</Text>
              <Text style={{ ...s.thNum, width: "22%", textAlign: "right" }}>Amount</Text>
            </View>
            {o.items.map((item, i) => (
              <View key={i} style={i % 2 === 0 ? s.tRow : s.tRowAlt}>
                <Text style={s.tdClass}>{item.className}</Text>
                <Text style={s.tdNum}>{item.quantity}</Text>
                <Text style={s.tdMuted}>{fmt(item.mrp)}</Text>
                <Text style={s.tdNum}>{fmt(item.unitPrice)}</Text>
                <Text style={{ ...s.tdBold, width: "22%" }}>{fmt(item.total)}</Text>
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Gross Total</Text>
              <Text style={s.totalValue}>{fmt(o.grossAmount)}</Text>
            </View>
          </View>
        </View>

        {/* POCs */}
        {o.pocs.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Points of Contact</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {o.pocs.map((p, i) => (
                <View key={i} style={{ width: "47%", border: "0.5 solid #e4e4e7", borderRadius: 4, padding: "6 8", marginBottom: 5 }}>
                  <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#6366f1", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{p.role}</Text>
                  {p.name  && <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 1 }}>{p.name}</Text>}
                  {p.phone && <Text style={{ fontSize: 8, color: "#6b7280", marginBottom: 1 }}>{p.phone}</Text>}
                  {p.email && <Text style={{ fontSize: 8, color: "#6b7280" }}>{p.email}</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Nutshell GK Books</Text>
          <Text style={s.footerText}>Order ID: {o.id}</Text>
          <Text style={s.footerText}>Generated {new Date().toLocaleDateString("en-IN")}</Text>
        </View>

      </Page>
    </Document>
  );
}

export async function generateOrderPdf(order: OrderData): Promise<Buffer> {
  const buf = await renderToBuffer(<OrderDoc o={order} />);
  return Buffer.from(buf);
}
