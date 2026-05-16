import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_CATEGORIES = ["Stationery", "Cleaning Items", "Paper", "Trophy", "Electronics"];
const PURCHASERS = ["Nitesh Sir", "Jayati Mam", "Daksh Sir", "GP Sir"];
const BRANCHES = ["RN", "RJ"];
const ALLOCATORS = ["Nitesh Sir", "Daksh Sir", "Jayati Mam"];
const SELLERS = ["Bhumi Mam", "Dimple Mam", "Daksh Sir"];
const PAYMENT_MODES = ["Cash", "Online", "Cheque"];
const ACCOUNTS = ["NM", "SM", "EM", "ASCE"];
const QTY_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const UOM_OPTIONS = ["PCS", "LTR", "SET", "KG", "BOX", "PACK", "ROLL", "REAM", "DOZEN", "PAIR"];

const TABS = [
  { id: "purchase", label: "Purchase Entry", icon: "🛒" },
  { id: "headoffice", label: "Head Office Stock", icon: "🏢" },
  { id: "allocate", label: "Allocate to Branch", icon: "📦" },
  { id: "branch", label: "Branch Stock", icon: "🏬" },
  { id: "sale", label: "Sale Entry", icon: "💰" },
  { id: "search", label: "Item Search", icon: "🔍" },
];

const STORAGE_KEY = "edumission-inventory-data";

function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function generatePurchaseId(purchases) { return "PUR-" + String(purchases.length + 1).padStart(4, "0"); }
function generateSaleId(sales) { return "SAL-" + String(sales.length + 1).padStart(4, "0"); }

function ComboBox({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = options.filter((o) => o.toLowerCase().includes((value || "").toLowerCase()));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex" }}>
        <input style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0, flex: 1 }}
          placeholder={placeholder} value={value}
          onChange={(e) => { onChange(e.target.value); setTyping(true); setOpen(true); }}
          onFocus={() => setOpen(true)} />
        <button onClick={() => { setOpen(!open); setTyping(false); }} style={dropBtn}>▾</button>
      </div>
      {open && (filtered.length > 0 || (!typing && options.length > 0)) && (
        <div style={dropMenu}>
          {(typing ? filtered : options).map((opt) => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false); setTyping(false); }}
              style={dropItem(value === opt)}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(234,88,12,0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.background = value === opt ? "rgba(234,88,12,0.12)" : "transparent"}>
              {opt}
            </div>
          ))}
          {typing && filtered.length === 0 && value && (
            <div style={{ padding: "10px 14px", fontSize: 12, color: "#10b981" }}>✨ "{value}" naya add hoga</div>
          )}
        </div>
      )}
    </div>
  );
}

function QtyComboBox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={{ display: "flex" }}>
        <input style={{ ...inputStyle, borderTopRightRadius: 0, borderBottomRightRadius: 0, flex: 1 }}
          type="number" min="1" placeholder="Quantity daalein" value={value}
          onChange={(e) => { onChange(e.target.value); setManual(true); }}
          onFocus={() => { setOpen(true); setManual(false); }} />
        <button onClick={() => { setOpen(!open); setManual(false); }} style={dropBtn}>▾</button>
      </div>
      {open && !manual && (
        <div style={dropMenu}>
          {QTY_PRESETS.map((q) => (
            <div key={q} onClick={() => { onChange(String(q)); setOpen(false); }}
              style={dropItem(String(value) === String(q))}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(234,88,12,0.1)"}
              onMouseLeave={(e) => e.currentTarget.style.background = String(value) === String(q) ? "rgba(234,88,12,0.12)" : "transparent"}>
              {q}
            </div>
          ))}
          <div style={{ padding: "8px 14px", fontSize: 11, color: "#64748b", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            ↑ Select karein ya type karein
          </div>
        </div>
      )}
    </div>
  );
}

export default function InventoryApp() {
  const [activeTab, setActiveTab] = useState("purchase");
  const [data, setData] = useState({ purchases: [], allocations: [], sales: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const emptyPurchase = () => ({
    vendor: "", vendorContact: "", vendorAddress: "",
    category: DEFAULT_CATEGORIES[0], itemName: "", uom: UOM_OPTIONS[0],
    quantity: "", pricePerPiece: "", paidBy: PURCHASERS[0],
    date: new Date().toISOString().slice(0, 10),
  });
  const emptySale = () => ({
    branch: BRANCHES[0], itemName: "", category: "", quantity: "",
    price: "", freeOfCost: false, customerName: "", customerPhone: "", customerEmail: "",
    soldBy: SELLERS[0], paymentMode: PAYMENT_MODES[0], account: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase());
  const [allocForm, setAllocForm] = useState({ itemName: "", category: "", uom: "", quantity: "", allocatedBy: ALLOCATORS[0], branch: BRANCHES[0] });
  const [saleForm, setSaleForm] = useState(emptySale());

  // localStorage load
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setData(JSON.parse(saved));
    } catch (e) {}
    setLoading(false);
  }, []);

  // localStorage save
  useEffect(() => {
    if (loading) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }, [data, loading]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 2500);
  }, []);

  const uniqueVendors = [...new Set(data.purchases.map((p) => p.vendor).filter(Boolean))];
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...data.purchases.map((p) => p.category).filter(Boolean)])];
  const uniqueItems = [...new Set(data.purchases.map((p) => p.itemName).filter(Boolean))];
  const uniqueContacts = [...new Set(data.purchases.map((p) => p.vendorContact).filter(Boolean))];
  const uniqueAddresses = [...new Set(data.purchases.map((p) => p.vendorAddress).filter(Boolean))];
  const uniqueCustomerPhones = [...new Set(data.sales.map((s) => s.customerPhone).filter(Boolean))];
  const uniqueCustomerEmails = [...new Set(data.sales.map((s) => s.customerEmail).filter(Boolean))];

  const getHeadOfficeStock = useCallback(() => {
    const stock = {};
    data.purchases.forEach((p) => {
      const key = p.itemName;
      if (!stock[key]) stock[key] = { itemName: p.itemName, category: p.category, uom: p.uom || "PCS", purchased: 0, allocated: 0 };
      stock[key].purchased += Number(p.quantity);
      if (p.category) stock[key].category = p.category;
      if (p.uom) stock[key].uom = p.uom;
    });
    data.allocations.forEach((a) => {
      const key = a.itemName;
      if (stock[key]) stock[key].allocated += Number(a.quantity);
    });
    return Object.values(stock).map((s) => ({ ...s, available: s.purchased - s.allocated }));
  }, [data]);

  const getBranchStock = useCallback((branch) => {
    const stock = {};
    data.allocations.filter((a) => a.branch === branch).forEach((a) => {
      const key = a.itemName;
      if (!stock[key]) stock[key] = { itemName: a.itemName, category: a.category, uom: a.uom || "PCS", allocated: 0, sold: 0 };
      stock[key].allocated += Number(a.quantity);
    });
    data.sales.filter((s) => s.branch === branch).forEach((s) => {
      const key = s.itemName;
      if (stock[key]) stock[key].sold += Number(s.quantity);
    });
    return Object.values(stock).map((s) => ({ ...s, available: s.allocated - s.sold }));
  }, [data]);

  const getAvailableItems = useCallback(() => getHeadOfficeStock().filter((s) => s.available > 0), [getHeadOfficeStock]);
  const getBranchAvailableItems = useCallback((branch) => getBranchStock(branch).filter((s) => s.available > 0), [getBranchStock]);

  const handlePurchase = () => {
    const { vendor, itemName, quantity, pricePerPiece } = purchaseForm;
    if (!vendor || !itemName || !quantity || !pricePerPiece) { showToast("Sabhi required fields bharna zaroori hai!", "error"); return; }
    const purchaseId = generatePurchaseId(data.purchases);
    setData((prev) => ({ ...prev, purchases: [...prev.purchases, { ...purchaseForm, id: generateId(), purchaseId, quantity: Number(quantity), pricePerPiece: Number(pricePerPiece) }] }));
    setPurchaseForm(emptyPurchase());
    showToast(`✅ Purchase ${purchaseId} saved!`);
  };

  const handleAllocate = () => {
    const { itemName, quantity } = allocForm;
    if (!itemName || !quantity) { showToast("Item aur quantity daalein!", "error"); return; }
    const hoStock = getHeadOfficeStock();
    const item = hoStock.find((s) => s.itemName === itemName);
    if (!item || Number(quantity) > item.available) { showToast(`HO mein sirf ${item ? item.available : 0} available!`, "error"); return; }
    setData((prev) => ({ ...prev, allocations: [...prev.allocations, { ...allocForm, id: generateId(), quantity: Number(quantity) }] }));
    setAllocForm({ itemName: "", category: "", uom: "", quantity: "", allocatedBy: ALLOCATORS[0], branch: BRANCHES[0] });
    showToast(`📦 ${quantity} ${itemName} → ${allocForm.branch}!`);
  };

  const handleSale = () => {
    const { branch, itemName, quantity, price, customerName, freeOfCost, paymentMode, account } = saleForm;
    if (!itemName || !quantity || !customerName) { showToast("Item, quantity aur customer name daalein!", "error"); return; }
    if (!freeOfCost && !price) { showToast("Price daalein ya Free of Cost select karein!", "error"); return; }
    if ((paymentMode === "Online" || paymentMode === "Cheque") && !account) { showToast("Account select karein!", "error"); return; }
    const brStock = getBranchStock(branch);
    const item = brStock.find((s) => s.itemName === itemName);
    if (!item || Number(quantity) > item.available) { showToast(`${branch} mein sirf ${item ? item.available : 0} available!`, "error"); return; }
    const saleId = generateSaleId(data.sales);
    setData((prev) => ({ ...prev, sales: [...prev.sales, { ...saleForm, id: generateId(), saleId, quantity: Number(quantity), price: freeOfCost ? 0 : Number(price), account: (paymentMode === "Online" || paymentMode === "Cheque") ? account : "" }] }));
    setSaleForm({ ...emptySale(), branch: saleForm.branch });
    showToast(`💰 Sale ${saleId} saved!`);
  };

  const generatePDF = () => {
    const rows = [...data.sales].reverse().map((s, i) => `
      <tr style="background:${i % 2 === 0 ? "#f8f9fa" : "#fff"}">
        <td>${s.saleId || "—"}</td><td>${s.date}</td><td>${s.branch}</td>
        <td>${s.itemName}</td><td>${s.category}</td><td>${s.quantity}</td>
        <td>${s.freeOfCost ? "FREE" : "₹" + s.price}</td><td>${s.customerName}</td>
        <td>${s.customerPhone || "—"}</td><td>${s.customerEmail || "—"}</td>
        <td>${s.soldBy}</td><td>${s.paymentMode}${s.account ? "/" + s.account : ""}</td>
      </tr>`).join("");
    const totalSales = data.sales.filter(s => !s.freeOfCost).reduce((acc, s) => acc + (s.price || 0), 0);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Edumission Sale Report</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#222;}h1{color:#ea580c;margin:0;font-size:28px;}.subtitle{color:#888;font-size:13px;margin-bottom:24px;}.summary{display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap;}.card{background:#fff7f0;border:1px solid #fde8d8;border-radius:10px;padding:16px 24px;}.card .num{font-size:26px;font-weight:900;color:#ea580c;}.card .lbl{font-size:12px;color:#888;}table{width:100%;border-collapse:collapse;font-size:12px;}th{background:#ea580c;color:#fff;padding:8px 10px;text-align:left;}td{padding:7px 10px;border-bottom:1px solid #eee;}.footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center;}</style>
    </head><body>
    <h1>🏫 EDUMISSION</h1>
    <div class="subtitle">Sale Report — Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
    <div class="summary">
      <div class="card"><div class="num">${data.sales.length}</div><div class="lbl">Total Sales</div></div>
      <div class="card"><div class="num">₹${totalSales.toLocaleString("en-IN")}</div><div class="lbl">Total Revenue</div></div>
      <div class="card"><div class="num">${data.sales.filter(s => s.freeOfCost).length}</div><div class="lbl">Free of Cost</div></div>
    </div>
    <table><thead><tr><th>Sale ID</th><th>Date</th><th>Branch</th><th>Item</th><th>Category</th><th>Qty</th><th>Price</th><th>Customer</th><th>Phone</th><th>Email</th><th>Sold By</th><th>Payment</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="footer">Edumission Inventory System • Confidential</div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `Edumission_Sale_Report_${new Date().toISOString().slice(0,10)}.html`;
    a.click(); URL.revokeObjectURL(url);
    showToast("📄 Report download ho rahi hai!");
  };

  const deletePurchase = (id) => setData((p) => ({ ...p, purchases: p.purchases.filter((x) => x.id !== id) }));
  const deleteAllocation = (id) => setData((p) => ({ ...p, allocations: p.allocations.filter((x) => x.id !== id) }));
  const deleteSale = (id) => setData((p) => ({ ...p, sales: p.sales.filter((x) => x.id !== id) }));

  const handleReset = () => {
    if (window.confirm("⚠️ Saara data permanently delete ho jayega!")) {
      setData({ purchases: [], allocations: [], sales: [] });
      localStorage.removeItem(STORAGE_KEY);
      showToast("Data reset ho gaya!");
    }
  };

  const searchResults = useCallback(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    const hoStock = getHeadOfficeStock();
    const matchedItems = [...new Set(data.purchases.map(p => p.itemName).filter(n => n.toLowerCase().includes(q)))];
    return matchedItems.map((itemName) => {
      const stock = hoStock.find(s => s.itemName === itemName);
      const purchased = data.purchases.filter(p => p.itemName === itemName);
      const allocated = data.allocations.filter(a => a.itemName === itemName);
      const sold = data.sales.filter(s => s.itemName === itemName);
      return { itemName, stock, totalPurchased: purchased.reduce((a, p) => a + Number(p.quantity), 0), totalAllocated: allocated.reduce((a, a2) => a + Number(a2.quantity), 0), totalSold: sold.reduce((a, s) => a + Number(s.quantity), 0), purchases: purchased, allocations: allocated, sales: sold };
    });
  }, [searchQuery, data, getHeadOfficeStock]);

  const hoStock = getHeadOfficeStock();
  const availableItems = getAvailableItems();
  const branchAvail = getBranchAvailableItems(saleForm.branch);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0e1a" }}>
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 16 }}>📋</div><p style={{ color: "#64748b", fontSize: 16 }}>Loading...</p></div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", fontFamily: "'Segoe UI', Tahoma, sans-serif", color: "#e2e8f0" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-15%", right: "-8%", width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(234,88,12,0.07) 0%, transparent 70%)" }} />
      </div>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: toast.type === "error" ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#059669,#10b981)", color: "#fff", padding: "14px 32px", borderRadius: 14, fontWeight: 700, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", animation: "slideDown 0.3s ease" }}>{toast.msg}</div>
      )}
      <div style={{ display: "flex", minHeight: "100vh", position: "relative", zIndex: 1 }}>
        {/* Sidebar */}
        <div style={{ width: 270, background: "linear-gradient(180deg, #0f1525 0%, #0a0e1a 100%)", borderRight: "1px solid rgba(234,88,12,0.12)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(234,88,12,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #ea580c, #f97316)", fontSize: 20, fontWeight: 900, color: "#fff", boxShadow: "0 4px 16px rgba(234,88,12,0.4)" }}>E</div>
              <div><h1 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: "#f97316" }}>EDUMISSION</h1><p style={{ fontSize: 10, color: "#64748b", margin: "2px 0 0", letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 600 }}>Inventory System</p></div>
            </div>
          </div>
          <div style={{ padding: "12px 0", flex: 1 }}>
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 24px", width: "100%", border: "none", cursor: "pointer", fontSize: 14, fontWeight: active ? 700 : 500, background: active ? "rgba(234,88,12,0.1)" : "transparent", color: active ? "#fb923c" : "#64748b", borderLeft: active ? "3px solid #ea580c" : "3px solid transparent", transition: "all 0.2s", textAlign: "left" }}>
                <span style={{ fontSize: 19 }}>{tab.icon}</span>{tab.label}
              </button>);
            })}
          </div>
          <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(234,88,12,0.08)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[{ n: data.purchases.length, l: "Purchases", c: "#ea580c" }, { n: data.allocations.length, l: "Allocated", c: "#0ea5e9" }, { n: data.sales.length, l: "Sales", c: "#10b981" }].map((s) => (
                <div key={s.l} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.n}</div>
                  <div style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 1 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <button onClick={handleReset} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>🗑 Reset All Data</button>
            <p style={{ fontSize: 9, color: "#334155", marginTop: 8, textAlign: "center" }}>💾 Device mein auto-save</p>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: "32px 40px", maxWidth: 1100, overflowY: "auto" }}>

          {activeTab === "purchase" && (
            <div>
              <SectionHeader icon="🛒" title="Purchase Entry" subtitle="Vendor se saman khareedein" />
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20, background: "rgba(234,88,12,0.08)", border: "1px solid rgba(234,88,12,0.15)", borderRadius: 12, padding: "10px 20px" }}>
                <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>NEXT PURCHASE ID:</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: "#f97316", letterSpacing: 1, fontFamily: "monospace" }}>{generatePurchaseId(data.purchases)}</span>
              </div>
              <FormCard>
                <SectionDivider label="Vendor Information" />
                <div style={gridStyle}>
                  <Field label="Vendor Name *"><ComboBox options={uniqueVendors} value={purchaseForm.vendor} onChange={(v) => setPurchaseForm((p) => ({ ...p, vendor: v }))} placeholder="Vendor chunein ya naya likhein" /></Field>
                  <Field label="Vendor Contact"><ComboBox options={uniqueContacts} value={purchaseForm.vendorContact} onChange={(v) => setPurchaseForm((p) => ({ ...p, vendorContact: v }))} placeholder="Phone number" /></Field>
                  <Field label="Vendor Address"><ComboBox options={uniqueAddresses} value={purchaseForm.vendorAddress} onChange={(v) => setPurchaseForm((p) => ({ ...p, vendorAddress: v }))} placeholder="Address likhein ya chunein" /></Field>
                  <Field label="Date of Purchase"><input style={inputStyle} type="date" value={purchaseForm.date} onChange={(e) => setPurchaseForm((p) => ({ ...p, date: e.target.value }))} /></Field>
                </div>
                <SectionDivider label="Item Details" />
                <div style={gridStyle}>
                  <Field label="Category *"><ComboBox options={allCategories} value={purchaseForm.category} onChange={(v) => setPurchaseForm((p) => ({ ...p, category: v }))} placeholder="Category chunein" /></Field>
                  <Field label="Item Name *"><ComboBox options={uniqueItems} value={purchaseForm.itemName} onChange={(v) => setPurchaseForm((p) => ({ ...p, itemName: v }))} placeholder="Item chunein ya naya likhein" /></Field>
                  <Field label="UOM (Unit)"><ComboBox options={UOM_OPTIONS} value={purchaseForm.uom} onChange={(v) => setPurchaseForm((p) => ({ ...p, uom: v }))} placeholder="PCS, LTR, SET..." /></Field>
                  <Field label="Purchase Quantity *"><QtyComboBox value={purchaseForm.quantity} onChange={(v) => setPurchaseForm((p) => ({ ...p, quantity: v }))} /></Field>
                  <Field label="Price Per Piece (₹) *"><input style={inputStyle} type="number" min="0" placeholder="₹ per piece" value={purchaseForm.pricePerPiece} onChange={(e) => setPurchaseForm((p) => ({ ...p, pricePerPiece: e.target.value }))} /></Field>
                  <Field label="Payment Made By"><select style={inputStyle} value={purchaseForm.paidBy} onChange={(e) => setPurchaseForm((p) => ({ ...p, paidBy: e.target.value }))}>{PURCHASERS.map((p) => <option key={p}>{p}</option>)}</select></Field>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, flexWrap: "wrap", gap: 12 }}>
                  <div style={{ fontSize: 14, color: "#64748b" }}>Total: <span style={{ color: "#f97316", fontSize: 20, fontWeight: 900 }}>₹{((purchaseForm.quantity || 0) * (purchaseForm.pricePerPiece || 0)).toLocaleString("en-IN")}</span></div>
                  <button style={btnPrimary} onClick={handlePurchase}>✅ Save Purchase</button>
                </div>
              </FormCard>
              {data.purchases.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <h3 style={historyTitle}>📜 Purchase History ({data.purchases.length})</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={tableStyle}>
                      <thead><tr>{["ID","Date","Vendor","Contact","Category","Item","UOM","Qty","₹/pc","Total","Paid By",""].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                      <tbody>{[...data.purchases].reverse().map((p) => (
                        <tr key={p.id} style={trStyle}>
                          <td style={{...tdStyle,fontWeight:800,color:"#f97316",fontSize:11,fontFamily:"monospace"}}>{p.purchaseId||"—"}</td>
                          <td style={tdStyle}>{p.date}</td><td style={tdStyle}>{p.vendor}</td><td style={tdStyle}>{p.vendorContact||"—"}</td>
                          <td style={tdStyle}><Badge bg={categoryColor(p.category)}>{p.category}</Badge></td>
                          <td style={{...tdStyle,fontWeight:700,color:"#f1f5f9"}}>{p.itemName}</td>
                          <td style={{...tdStyle,fontWeight:600,color:"#0ea5e9",fontSize:11}}>{p.uom||"PCS"}</td>
                          <td style={tdStyle}>{p.quantity}</td><td style={tdStyle}>₹{p.pricePerPiece}</td>
                          <td style={{...tdStyle,color:"#f97316",fontWeight:700}}>₹{(p.quantity*p.pricePerPiece).toLocaleString("en-IN")}</td>
                          <td style={tdStyle}>{p.paidBy}</td>
                          <td style={tdStyle}><button style={delBtn} onClick={()=>deletePurchase(p.id)}>✕</button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "headoffice" && (
            <div>
              <SectionHeader icon="🏢" title="Head Office Stock" subtitle="Consolidated inventory — same item merge hota hai" />
              {hoStock.length === 0 ? <EmptyState text="Koi purchase nahi hua abhi." /> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead><tr>{["Category","Item Name","UOM","Purchased","Allocated","Available"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                    <tbody>{hoStock.map((s,i)=>(
                      <tr key={i} style={trStyle}>
                        <td style={tdStyle}><Badge bg={categoryColor(s.category)}>{s.category}</Badge></td>
                        <td style={{...tdStyle,fontWeight:700,color:"#f1f5f9"}}>{s.itemName}</td>
                        <td style={{...tdStyle,fontWeight:600,color:"#0ea5e9",fontSize:11}}>{s.uom||"PCS"}</td>
                        <td style={tdStyle}>{s.purchased}</td>
                        <td style={{...tdStyle,color:"#f59e0b"}}>{s.allocated}</td>
                        <td style={{...tdStyle,fontWeight:800,fontSize:15,color:s.available>0?"#10b981":"#ef4444"}}>{s.available}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "allocate" && (
            <div>
              <SectionHeader icon="📦" title="Allocate to Branch" subtitle="Head Office se RN / RJ ko saman bhejein" />
              {availableItems.length === 0 ? <EmptyState text="HO mein koi item available nahi." /> : (
                <FormCard>
                  <div style={gridStyle}>
                    <Field label="Select Item">
                      <select style={inputStyle} value={allocForm.itemName} onChange={(e) => { const item=availableItems.find(i=>i.itemName===e.target.value); setAllocForm(p=>({...p,itemName:e.target.value,category:item?item.category:"",uom:item?item.uom:"PCS"})); }}>
                        <option value="">-- Item chunein --</option>
                        {availableItems.map(item=><option key={item.itemName} value={item.itemName}>{item.itemName} (Avail: {item.available})</option>)}
                      </select>
                    </Field>
                    <Field label="Category"><input style={{...inputStyle,opacity:0.6}} value={allocForm.category} readOnly /></Field>
                    <Field label="Quantity"><input style={inputStyle} type="number" min="1" placeholder="Kitne bhejne hain" value={allocForm.quantity} onChange={(e)=>setAllocForm(p=>({...p,quantity:e.target.value}))} /></Field>
                    <Field label="Allocated By"><select style={inputStyle} value={allocForm.allocatedBy} onChange={(e)=>setAllocForm(p=>({...p,allocatedBy:e.target.value}))}>{ALLOCATORS.map(a=><option key={a}>{a}</option>)}</select></Field>
                    <Field label="Branch"><select style={inputStyle} value={allocForm.branch} onChange={(e)=>setAllocForm(p=>({...p,branch:e.target.value}))}>{BRANCHES.map(b=><option key={b}>{b}</option>)}</select></Field>
                  </div>
                  <div style={{display:"flex",justifyContent:"flex-end",marginTop:24}}><button style={btnPrimary} onClick={handleAllocate}>📦 Allocate Now</button></div>
                </FormCard>
              )}
              {data.allocations.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <h3 style={historyTitle}>📜 Allocation History ({data.allocations.length})</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={tableStyle}>
                      <thead><tr>{["Item","Category","Qty","Branch","By",""].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                      <tbody>{[...data.allocations].reverse().map(a=>(
                        <tr key={a.id} style={trStyle}>
                          <td style={{...tdStyle,fontWeight:700,color:"#f1f5f9"}}>{a.itemName}</td>
                          <td style={tdStyle}><Badge bg={categoryColor(a.category)}>{a.category}</Badge></td>
                          <td style={tdStyle}>{a.quantity}</td>
                          <td style={tdStyle}><Badge bg={a.branch==="RN"?"#7c3aed":"#0284c7"}>{a.branch}</Badge></td>
                          <td style={tdStyle}>{a.allocatedBy}</td>
                          <td style={tdStyle}><button style={delBtn} onClick={()=>deleteAllocation(a.id)}>✕</button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "branch" && (
            <div>
              <SectionHeader icon="🏬" title="Branch Stock" subtitle="RN aur RJ ka real-time stock" />
              <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
                {BRANCHES.map((branch) => {
                  const stock = getBranchStock(branch);
                  const brColor = branch==="RN"?"#7c3aed":"#0284c7";
                  return (
                    <div key={branch} style={{ flex: "1 1 440px", minWidth: 320 }}>
                      <div style={{ background: "rgba(15,21,37,0.8)", borderRadius: 20, border: `1px solid ${brColor}22`, padding: 28 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
                          <div style={{ width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",background:`${brColor}20`,fontSize:16,fontWeight:900,color:brColor }}>{branch}</div>
                          <h3 style={{ fontSize:17,fontWeight:800,margin:0,color:brColor }}>Branch {branch}</h3>
                        </div>
                        {stock.length===0?<p style={{color:"#334155",fontSize:14,textAlign:"center",padding:24}}>Koi stock nahi</p>:(
                          <table style={{...tableStyle,fontSize:13}}>
                            <thead><tr>{["Category","Item","UOM","In","Out","Avail"].map(h=><th key={h} style={{...thStyle,padding:"8px 10px",fontSize:10}}>{h}</th>)}</tr></thead>
                            <tbody>{stock.map((s,i)=>(
                              <tr key={i} style={trStyle}>
                                <td style={{...tdStyle,padding:"8px 10px"}}><Badge bg={categoryColor(s.category)} small>{s.category}</Badge></td>
                                <td style={{...tdStyle,padding:"8px 10px",fontWeight:700}}>{s.itemName}</td>
                                <td style={{...tdStyle,padding:"8px 10px",fontWeight:600,color:"#0ea5e9",fontSize:11}}>{s.uom||"PCS"}</td>
                                <td style={{...tdStyle,padding:"8px 10px"}}>{s.allocated}</td>
                                <td style={{...tdStyle,padding:"8px 10px",color:"#f59e0b"}}>{s.sold}</td>
                                <td style={{...tdStyle,padding:"8px 10px",fontWeight:800,color:s.available>0?"#10b981":"#ef4444"}}>{s.available}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "sale" && (
            <div>
              <SectionHeader icon="💰" title="Sale Entry" subtitle="Branch se customer ko item bechein" />
              <div style={{ display:"inline-flex",alignItems:"center",gap:10,marginBottom:20,background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:12,padding:"10px 20px" }}>
                <span style={{fontSize:12,color:"#64748b",fontWeight:600}}>NEXT SALE ID:</span>
                <span style={{fontSize:18,fontWeight:900,color:"#10b981",letterSpacing:1,fontFamily:"monospace"}}>{generateSaleId(data.sales)}</span>
              </div>
              <FormCard>
                <SectionDivider label="Item & Branch" />
                <div style={gridStyle}>
                  <Field label="Branch"><select style={inputStyle} value={saleForm.branch} onChange={(e)=>setSaleForm(p=>({...p,branch:e.target.value,itemName:"",category:""}))}>{BRANCHES.map(b=><option key={b}>{b}</option>)}</select></Field>
                  <Field label="Item">
                    <select style={inputStyle} value={saleForm.itemName} onChange={(e)=>{const item=branchAvail.find(i=>i.itemName===e.target.value);setSaleForm(p=>({...p,itemName:e.target.value,category:item?item.category:""}));}}>
                      <option value="">-- Item chunein --</option>
                      {branchAvail.map(item=><option key={item.itemName} value={item.itemName}>{item.itemName} (Avail: {item.available})</option>)}
                    </select>
                  </Field>
                  <Field label="Category"><input style={{...inputStyle,opacity:0.6}} value={saleForm.category} readOnly /></Field>
                  <Field label="Quantity"><input style={inputStyle} type="number" min="1" placeholder="Kitne pieces" value={saleForm.quantity} onChange={(e)=>setSaleForm(p=>({...p,quantity:e.target.value}))} /></Field>
                  <Field label="Sold By"><select style={inputStyle} value={saleForm.soldBy} onChange={(e)=>setSaleForm(p=>({...p,soldBy:e.target.value}))}>{SELLERS.map(s=><option key={s}>{s}</option>)}</select></Field>
                  <Field label="Date of Sale"><input style={inputStyle} type="date" value={saleForm.date} onChange={(e)=>setSaleForm(p=>({...p,date:e.target.value}))} /></Field>
                </div>
                <SectionDivider label="Customer Details" />
                <div style={gridStyle}>
                  <Field label="Customer Name *"><input style={inputStyle} placeholder="Customer ka naam" value={saleForm.customerName} onChange={(e)=>setSaleForm(p=>({...p,customerName:e.target.value}))} /></Field>
                  <Field label="Customer Phone"><ComboBox options={uniqueCustomerPhones} value={saleForm.customerPhone} onChange={(v)=>setSaleForm(p=>({...p,customerPhone:v}))} placeholder="Phone number" /></Field>
                  <Field label="Customer Email"><ComboBox options={uniqueCustomerEmails} value={saleForm.customerEmail} onChange={(v)=>setSaleForm(p=>({...p,customerEmail:v}))} placeholder="Email address" /></Field>
                </div>
                <SectionDivider label="Payment Details" />
                <div style={gridStyle}>
                  <Field label="Free of Cost?">
                    <div style={{display:"flex",alignItems:"center",gap:10,height:44}}>
                      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14}}>
                        <input type="checkbox" checked={saleForm.freeOfCost} onChange={(e)=>setSaleForm(p=>({...p,freeOfCost:e.target.checked,price:e.target.checked?"":p.price}))} />
                        Haan, Free of Cost
                      </label>
                    </div>
                  </Field>
                  {!saleForm.freeOfCost&&(<Field label="Price (₹)"><input style={inputStyle} type="number" min="0" placeholder="₹ total price" value={saleForm.price} onChange={(e)=>setSaleForm(p=>({...p,price:e.target.value}))} /></Field>)}
                  <Field label="Payment Mode"><select style={inputStyle} value={saleForm.paymentMode} onChange={(e)=>setSaleForm(p=>({...p,paymentMode:e.target.value,account:""}))}>{PAYMENT_MODES.map(m=><option key={m}>{m}</option>)}</select></Field>
                  {(saleForm.paymentMode==="Online"||saleForm.paymentMode==="Cheque")&&(
                    <Field label="Account"><select style={inputStyle} value={saleForm.account} onChange={(e)=>setSaleForm(p=>({...p,account:e.target.value}))}><option value="">-- Account chunein --</option>{ACCOUNTS.map(a=><option key={a}>{a}</option>)}</select></Field>
                  )}
                </div>
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:24}}><button style={btnPrimary} onClick={handleSale}>💰 Save Sale</button></div>
              </FormCard>
              {data.sales.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:12}}>
                    <h3 style={historyTitle}>📜 Sales History ({data.sales.length})</h3>
                    <button onClick={generatePDF} style={{...btnPrimary,padding:"10px 20px",fontSize:13,background:"linear-gradient(135deg,#7c3aed,#8b5cf6)"}}>📄 Download Sale Report</button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={tableStyle}>
                      <thead><tr>{["Sale ID","Date","Branch","Item","Cat","Qty","Price","Customer","Phone","By","Pay",""].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                      <tbody>{[...data.sales].reverse().map(s=>(
                        <tr key={s.id} style={trStyle}>
                          <td style={{...tdStyle,fontWeight:800,color:"#10b981",fontSize:11,fontFamily:"monospace"}}>{s.saleId||"—"}</td>
                          <td style={tdStyle}>{s.date}</td>
                          <td style={tdStyle}><Badge bg={s.branch==="RN"?"#7c3aed":"#0284c7"}>{s.branch}</Badge></td>
                          <td style={{...tdStyle,fontWeight:700,color:"#f1f5f9"}}>{s.itemName}</td>
                          <td style={tdStyle}><Badge bg={categoryColor(s.category)} small>{s.category}</Badge></td>
                          <td style={tdStyle}>{s.quantity}</td>
                          <td style={{...tdStyle,color:s.freeOfCost?"#10b981":"#f97316",fontWeight:700}}>{s.freeOfCost?"FREE":`₹${s.price}`}</td>
                          <td style={tdStyle}>{s.customerName}</td>
                          <td style={tdStyle}>{s.customerPhone||"—"}</td>
                          <td style={tdStyle}>{s.soldBy}</td>
                          <td style={tdStyle}>{s.paymentMode}{s.account?"/"+s.account:""}</td>
                          <td style={tdStyle}><button style={delBtn} onClick={()=>deleteSale(s.id)}>✕</button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "search" && (
            <div>
              <SectionHeader icon="🔍" title="Item Search" subtitle="Kisi bhi item ka purchase, allocation aur sale ek jagah dekho" />
              <div style={{ marginBottom: 28 }}>
                <input style={{...inputStyle,fontSize:16,padding:"14px 18px",borderRadius:14,border:"1px solid rgba(234,88,12,0.3)"}}
                  placeholder="🔍 Item ka naam likhein jaise 'Pen', 'Register'..."
                  value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
              </div>
              {!searchQuery.trim() ? (
                <div style={{textAlign:"center",padding:"60px 20px",color:"#334155"}}>
                  <div style={{fontSize:52,marginBottom:12}}>🔍</div>
                  <p style={{fontSize:16}}>Upar item ka naam likhein</p>
                  <p style={{fontSize:13,color:"#475569",marginTop:8}}>Purchase, allocation aur sale ka poora hisaab dikh jayega</p>
                </div>
              ) : (() => {
                const results = searchResults();
                if (!results||results.length===0) return (<div style={{textAlign:"center",padding:"60px 20px",color:"#334155"}}><div style={{fontSize:52,marginBottom:12}}>📭</div><p>"{searchQuery}" koi item nahi mila</p></div>);
                return results.map((r) => (
                  <div key={r.itemName} style={{marginBottom:32,background:"rgba(15,21,37,0.7)",borderRadius:20,border:"1px solid rgba(234,88,12,0.1)",overflow:"hidden"}}>
                    <div style={{padding:"20px 28px",borderBottom:"1px solid rgba(234,88,12,0.08)",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                      <div style={{fontWeight:900,fontSize:20,color:"#f1f5f9"}}>{r.itemName}</div>
                      {r.stock&&<Badge bg={categoryColor(r.stock.category)}>{r.stock.category}</Badge>}
                      {r.stock&&<span style={{fontSize:11,color:"#0ea5e9",fontWeight:700}}>{r.stock.uom||"PCS"}</span>}
                    </div>
                    <div style={{display:"flex",gap:0,borderBottom:"1px solid rgba(234,88,12,0.08)"}}>
                      {[{label:"Total Purchased",value:r.totalPurchased,color:"#ea580c",icon:"🛒"},{label:"Total Allocated",value:r.totalAllocated,color:"#0ea5e9",icon:"📦"},{label:"Total Sold",value:r.totalSold,color:"#10b981",icon:"💰"},{label:"HO Available",value:r.stock?r.stock.available:0,color:r.stock&&r.stock.available>0?"#10b981":"#ef4444",icon:"🏢"}].map(c=>(
                        <div key={c.label} style={{flex:1,padding:"20px 16px",textAlign:"center",borderRight:"1px solid rgba(234,88,12,0.06)"}}>
                          <div style={{fontSize:24,marginBottom:4}}>{c.icon}</div>
                          <div style={{fontSize:26,fontWeight:900,color:c.color}}>{c.value}</div>
                          <div style={{fontSize:11,color:"#64748b",marginTop:4}}>{c.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:"20px 28px"}}>
                      {r.purchases.length>0&&(<div style={{marginBottom:20}}><div style={{fontSize:12,fontWeight:700,color:"#ea580c",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>🛒 Purchase Records ({r.purchases.length})</div><table style={tableStyle}><thead><tr>{["ID","Date","Vendor","Qty","₹/pc","Total","Paid By"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{r.purchases.map(p=>(<tr key={p.id} style={trStyle}><td style={{...tdStyle,fontFamily:"monospace",color:"#f97316",fontSize:11}}>{p.purchaseId||"—"}</td><td style={tdStyle}>{p.date}</td><td style={tdStyle}>{p.vendor}</td><td style={tdStyle}>{p.quantity}</td><td style={tdStyle}>₹{p.pricePerPiece}</td><td style={{...tdStyle,color:"#f97316",fontWeight:700}}>₹{(p.quantity*p.pricePerPiece).toLocaleString("en-IN")}</td><td style={tdStyle}>{p.paidBy}</td></tr>))}</tbody></table></div>)}
                      {r.allocations.length>0&&(<div style={{marginBottom:20}}><div style={{fontSize:12,fontWeight:700,color:"#0ea5e9",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>📦 Allocation Records ({r.allocations.length})</div><table style={tableStyle}><thead><tr>{["Qty","Branch","By"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{r.allocations.map(a=>(<tr key={a.id} style={trStyle}><td style={tdStyle}>{a.quantity}</td><td style={tdStyle}><Badge bg={a.branch==="RN"?"#7c3aed":"#0284c7"}>{a.branch}</Badge></td><td style={tdStyle}>{a.allocatedBy}</td></tr>))}</tbody></table></div>)}
                      {r.sales.length>0&&(<div><div style={{fontSize:12,fontWeight:700,color:"#10b981",marginBottom:10,textTransform:"uppercase",letterSpacing:1}}>💰 Sale Records ({r.sales.length})</div><table style={tableStyle}><thead><tr>{["Sale ID","Date","Branch","Qty","Price","Customer","By"].map(h=><th key={h} style={thStyle}>{h}</th>)}</tr></thead><tbody>{r.sales.map(s=>(<tr key={s.id} style={trStyle}><td style={{...tdStyle,fontFamily:"monospace",color:"#10b981",fontSize:11}}>{s.saleId||"—"}</td><td style={tdStyle}>{s.date}</td><td style={tdStyle}><Badge bg={s.branch==="RN"?"#7c3aed":"#0284c7"}>{s.branch}</Badge></td><td style={tdStyle}>{s.quantity}</td><td style={{...tdStyle,color:s.freeOfCost?"#10b981":"#f97316",fontWeight:700}}>{s.freeOfCost?"FREE":`₹${s.price}`}</td><td style={tdStyle}>{s.customerName}</td><td style={tdStyle}>{s.soldBy}</td></tr>))}</tbody></table></div>)}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

        </div>
      </div>
      <style>{`@keyframes slideDown{from{opacity:0;transform:translate(-50%,-20px);}to{opacity:1;transform:translate(-50%,0);}}*{box-sizing:border-box;}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-thumb{background:rgba(234,88,12,0.2);border-radius:3px;}input[type="checkbox"]{width:18px;height:18px;accent-color:#ea580c;cursor:pointer;}select option{background:#0f1525;color:#e2e8f0;}button:hover{opacity:0.9;}`}</style>
    </div>
  );
}

function SectionHeader({icon,title,subtitle}){return(<div style={{marginBottom:28}}><h2 style={{fontSize:26,fontWeight:900,margin:0,display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:30}}>{icon}</span><span style={{color:"#f1f5f9"}}>{title}</span></h2><p style={{color:"#475569",margin:"6px 0 0 46px",fontSize:13}}>{subtitle}</p></div>);}
function SectionDivider({label}){return(<div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0 16px"}}><div style={{height:1,flex:1,background:"rgba(234,88,12,0.1)"}} /><span style={{fontSize:11,fontWeight:700,color:"#ea580c",textTransform:"uppercase",letterSpacing:1.5}}>{label}</span><div style={{height:1,flex:1,background:"rgba(234,88,12,0.1)"}} /></div>);}
function FormCard({children}){return(<div style={{background:"rgba(15,21,37,0.7)",borderRadius:20,padding:28,border:"1px solid rgba(234,88,12,0.08)",boxShadow:"0 4px 32px rgba(0,0,0,0.3)"}}>{children}</div>);}
function Field({label,children}){return(<div><label style={{display:"block",fontSize:11,fontWeight:700,color:"#64748b",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>{label}</label>{children}</div>);}
function EmptyState({text}){return(<div style={{background:"rgba(15,21,37,0.5)",borderRadius:20,padding:"52px 24px",textAlign:"center",color:"#334155",border:"1px dashed rgba(234,88,12,0.15)"}}><div style={{fontSize:48,marginBottom:12,opacity:0.5}}>📭</div><p style={{margin:0,fontSize:15}}>{text}</p></div>);}
function Badge({bg,children,small}){return(<span style={{padding:small?"2px 8px":"3px 11px",borderRadius:20,fontSize:small?10:11,fontWeight:700,color:"#fff",background:bg,display:"inline-block"}}>{children}</span>);}
function categoryColor(cat){const map={Stationery:"#8b5cf6",Electronics:"#0ea5e9","Cleaning Items":"#059669",Trophy:"#d97706",Paper:"#ec4899"};return map[cat]||"#ea580c";}

const inputStyle={width:"100%",padding:"11px 14px",borderRadius:12,border:"1px solid rgba(234,88,12,0.15)",background:"rgba(10,14,26,0.8)",color:"#e2e8f0",fontSize:14,outline:"none"};
const gridStyle={display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))",gap:18};
const btnPrimary={padding:"13px 32px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg, #ea580c, #f97316)",color:"#fff",fontSize:15,fontWeight:800,boxShadow:"0 4px 20px rgba(234,88,12,0.35)"};
const tableStyle={width:"100%",borderCollapse:"separate",borderSpacing:"0 3px",fontSize:13};
const thStyle={textAlign:"left",padding:"10px 14px",fontSize:10,fontWeight:800,color:"#475569",textTransform:"uppercase",letterSpacing:1.2,borderBottom:"1px solid rgba(234,88,12,0.08)"};
const tdStyle={padding:"11px 14px",fontSize:13,color:"#94a3b8"};
const trStyle={background:"rgba(15,21,37,0.5)",borderRadius:8};
const historyTitle={fontSize:15,color:"#64748b",marginBottom:14,fontWeight:700};
const delBtn={background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,width:28,height:28,cursor:"pointer",color:"#ef4444",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"};
const dropBtn={background:"rgba(234,88,12,0.15)",border:"1px solid rgba(234,88,12,0.15)",borderLeft:"none",borderTopRightRadius:12,borderBottomRightRadius:12,color:"#fb923c",cursor:"pointer",padding:"0 12px",fontSize:16};
const dropMenu={position:"absolute",top:"100%",left:0,right:0,zIndex:100,background:"#141b2d",border:"1px solid rgba(234,88,12,0.2)",borderRadius:10,marginTop:4,maxHeight:180,overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"};
const dropItem=(selected)=>({padding:"10px 14px",cursor:"pointer",fontSize:13,color:"#e2e8f0",borderBottom:"1px solid rgba(255,255,255,0.04)",background:selected?"rgba(234,88,12,0.12)":"transparent"});
