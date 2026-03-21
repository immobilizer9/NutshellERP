"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ANNUAL_MRP: Record<number, number> = { 1:360,2:375,3:390,4:405,5:420,6:435,7:455,8:470 };
const PAPERBACK_MRP_PLAINS: Record<number, number> = { 1:600,2:600,3:660,4:660,5:660,6:660,7:660,8:660 };
const PAPERBACK_MRP_HILLS: Record<number, number>  = { 1:600,2:600,3:600,4:600,5:600,6:600,7:600,8:600 };
function getMRP(classNum: number, productType: string): number {
  if (productType === "PAPERBACKS_HILLS"   ) return PAPERBACK_MRP_HILLS[classNum];
  if (productType === "PAPERBACKS_PLAINS"  ) return PAPERBACK_MRP_PLAINS[classNum];
  if (productType === "NUTSHELL_PAPERBACKS") return PAPERBACK_MRP_PLAINS[classNum];
  if (productType === "NUTSHELL_ANNUAL"    ) return ANNUAL_MRP[classNum];
  return ANNUAL_MRP[classNum];
}

type ClassRow = { classNum:number; selected:boolean; quantity:number|""; agreedPrice:number|"" };
type POC = { role:string; name:string; phone:string; email:string };

const POC_ROLES = [
  "Principal / Director","Accounts Department","Coordinator","Quiz Incharge / Admin Office","Decision Maker",
];
const EMPTY_ROWS = (): ClassRow[] =>
  Array.from({length:8},(_,i)=>({classNum:i+1,selected:false,quantity:"",agreedPrice:""}));

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<"ORIGINAL"|"ADDITIONAL">("ORIGINAL");

  const [existingOrders, setExistingOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading]   = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");

  const [schools, setSchools]           = useState<any[]>([]);
  const [schoolsError, setSchoolsError] = useState("");

  const [schoolId, setSchoolId]           = useState("");
  const [productType, setProductType]     = useState("ANNUAL");
  const [schoolEmail, setSchoolEmail]     = useState("");
  const [schoolPhone, setSchoolPhone]     = useState("");
  const [address1, setAddress1]           = useState("");
  const [address2, setAddress2]           = useState("");
  const [pincode, setPincode]             = useState("");
  const [orderDate, setOrderDate]         = useState("");
  const [deliveryDate, setDeliveryDate]   = useState("");
  const [vendorName, setVendorName]       = useState("");
  const [vendorPhone, setVendorPhone]     = useState("");
  const [vendorEmail, setVendorEmail]     = useState("");
  const [vendorAddress, setVendorAddress] = useState("");

  const [pocs, setPocs] = useState<POC[]>(POC_ROLES.map(role=>({role,name:"",phone:"",email:""})));
  const [rows, setRows] = useState<ClassRow[]>(EMPTY_ROWS());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    fetch("/api/bd/schools",{credentials:"include"}).then(r=>r.json())
      .then(d=>{if(Array.isArray(d))setSchools(d);else setSchoolsError("Could not load schools.");})
      .catch(()=>setSchoolsError("Could not load schools."));
  },[]);

  useEffect(()=>{
    if(type!=="ADDITIONAL")return;
    setOrdersLoading(true);
    fetch("/api/orders/list",{credentials:"include"}).then(r=>r.json())
      .then(d=>{
        const originals=Array.isArray(d)?d.filter((o:any)=>o.type==="ORIGINAL"&&o.status!=="REJECTED"):[];
        setExistingOrders(originals);
      }).catch(()=>setExistingOrders([])).finally(()=>setOrdersLoading(false));
  },[type]);

  const handleSelectExistingOrder=(order:any)=>{
    setSelectedOrderId(order.id);
    setSchoolId(order.schoolId??order.school?.id??"");
    setProductType(order.productType??"ANNUAL");
    setSchoolEmail(order.schoolEmail??"");
    setSchoolPhone(order.schoolPhone??"");
    setAddress1(order.address1??"");
    setAddress2(order.address2??"");
    setPincode(order.pincode??"");
    setVendorName(order.vendorName??"");
    setVendorPhone(order.vendorPhone??"");
    setVendorEmail(order.vendorEmail??"");
    setVendorAddress(order.vendorAddress??"");
    setOrderDate(new Date().toISOString().slice(0,10));
    if(order.pocs?.length){
      setPocs(prev=>prev.map(p=>{
        const m=order.pocs.find((op:any)=>op.role===p.role);
        return m?{...p,name:m.name??"",phone:m.phone??"",email:m.email??""}:p;
      }));
    }
    setRows(EMPTY_ROWS());
  };

  useEffect(()=>{
    if(type!=="ORIGINAL")return;
    const s=schools.find(s=>s.id===schoolId);
    if(s)setSchoolPhone(s.contactPhone??"");
  },[schoolId,schools]);

  const updateRow=(classNum:number,field:keyof ClassRow,value:any)=>
    setRows(prev=>prev.map(r=>r.classNum===classNum?{...r,[field]:value}:r));

  const effectivePrice=(row:ClassRow)=>row.agreedPrice!==""?Number(row.agreedPrice):getMRP(row.classNum,productType);
  const rowTotal=(row:ClassRow)=>!row.selected||!row.quantity?0:Number(row.quantity)*effectivePrice(row);
  const grossTotal=rows.reduce((s,r)=>s+rowTotal(r),0);
  const selected=rows.filter(r=>r.selected);

  const validateStep1=()=>{
    if(!schoolId){setError("Please select a school.");return false;}
    if(!orderDate){setError("Please enter the order date.");return false;}
    if(type==="ADDITIONAL"&&!selectedOrderId){setError("Please select the original order.");return false;}
    setError("");return true;
  };
  const validateStep2=()=>{
    if(!selected.length){setError("Please select at least one class.");return false;}
    for(const r of selected){
      if(!r.quantity||Number(r.quantity)<=0){setError(`Class ${r.classNum}: quantity must be > 0.`);return false;}
    }
    setError("");return true;
  };

  const handleSubmit=async()=>{
    if(!validateStep2())return;
    setSubmitting(true);setError("");
    const payload={
      schoolId,type,productType,
      schoolEmail:schoolEmail||undefined,schoolPhone:schoolPhone||undefined,
      address1:address1||undefined,address2:address2||undefined,pincode:pincode||undefined,
      orderDate:orderDate||undefined,deliveryDate:deliveryDate||undefined,
      vendorName:vendorName||undefined,vendorPhone:vendorPhone||undefined,
      vendorEmail:vendorEmail||undefined,vendorAddress:vendorAddress||undefined,
      items:selected.map(r=>({classNum:r.classNum,quantity:Number(r.quantity),agreedPrice:r.agreedPrice!==""?Number(r.agreedPrice):undefined})),
      pocs:pocs.filter(p=>p.name||p.phone||p.email),
    };
    try{
      const res=await fetch("/api/orders/create",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(payload)});
      const data=await res.json();
      if(data.id)router.push(`/orders/${data.id}`);
      else setError(data.error||"Order creation failed.");
    }catch{setError("Something went wrong.");}
    finally{setSubmitting(false);}
  };

  const selectedSchool=schools.find(s=>s.id===schoolId);

  const RadioCard=({value,label,desc}:{value:string;label:string;desc:string})=>(
    <div onClick={()=>setType(value as any)} style={{border:`2px solid ${type===value?"var(--accent)":"var(--border)"}`,background:type===value?"var(--accent-soft)":"var(--surface)",borderRadius:"var(--radius-lg)",padding:"20px 22px",cursor:"pointer",transition:"all 0.15s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <p style={{fontWeight:700,fontSize:15,margin:"0 0 6px",color:type===value?"var(--accent)":"var(--text-primary)"}}>{label}</p>
          <p style={{fontSize:13,color:"var(--text-muted)",margin:0,lineHeight:1.5}}>{desc}</p>
        </div>
        <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,marginLeft:12,marginTop:2,border:`2px solid ${type===value?"var(--accent)":"var(--border)"}`,background:type===value?"var(--accent)":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {type===value&&<svg viewBox="0 0 10 10" width={10} height={10} fill="white"><circle cx={5} cy={5} r={3}/></svg>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{maxWidth:900,margin:"0 auto"}}>
      <div className="page-header">
        <h1>New Order</h1>
        <p>{step===0?"Step 1 of 3 — Select order type":step===1?"Step 2 of 3 — School, vendor & dates":"Step 3 of 3 — Contacts & quantities"}</p>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:28}}>
        {[0,1,2].map(s=><div key={s} style={{flex:1,height:4,borderRadius:99,background:s<=step?"var(--accent)":"var(--border)",transition:"background 0.3s"}}/>)}
      </div>

      {error&&<div className="alert alert-error" style={{marginBottom:20}}>{error}</div>}

      {/* STEP 0 */}
      {step===0&&(
        <div className="fade-in">
          <div className="card" style={{marginBottom:20}}>
            <h2 style={{marginBottom:6}}>What type of order is this?</h2>
            <p style={{color:"var(--text-muted)",fontSize:13,margin:"0 0 20px"}}>For additional orders, select an existing order to auto-fill school and vendor details.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <RadioCard value="ORIGINAL" label="Original Order" desc="First-time order for a school. Enter all details fresh." />
              <RadioCard value="ADDITIONAL" label="Additional Order" desc="Follow-up order for a school with an existing order. Details auto-filled." />
            </div>
          </div>

          {type==="ADDITIONAL"&&(
            <div className="card fade-in" style={{marginBottom:20}}>
              <h2 style={{marginBottom:6}}>Select the original order</h2>
              <p style={{color:"var(--text-muted)",fontSize:13,margin:"0 0 14px"}}>All school, vendor and contact details will be pre-filled from the selected order.</p>
              {ordersLoading?(
                <p style={{color:"var(--text-muted)",fontSize:13}}>Loading...</p>
              ):existingOrders.length===0?(
                <div className="alert alert-info">No original orders found. Create an original order first.</div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {existingOrders.map(order=>{
                    const isSel=selectedOrderId===order.id;
                    return(
                      <div key={order.id} onClick={()=>handleSelectExistingOrder(order)}
                        style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderRadius:"var(--radius-lg)",cursor:"pointer",border:`2px solid ${isSel?"var(--accent)":"var(--border)"}`,background:isSel?"var(--accent-soft)":"var(--surface)",transition:"all 0.15s"}}>
                        <div>
                          <p style={{fontWeight:600,margin:0,fontSize:13.5,color:isSel?"var(--accent)":"var(--text-primary)"}}>{order.school?.name}</p>
                          <p style={{color:"var(--text-muted)",fontSize:12,margin:"3px 0 0"}}>
                            {(order.productType??"ANNUAL").replaceAll("_"," ")} · {order.orderDate?new Date(order.orderDate).toLocaleDateString():new Date(order.createdAt).toLocaleDateString()} · ₹{order.grossAmount?.toLocaleString()}{order.vendorName&&` · ${order.vendorName}`}
                          </p>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <span style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:99,background:order.status==="APPROVED"?"var(--green-bg)":"var(--yellow-bg)",color:order.status==="APPROVED"?"var(--green)":"var(--yellow)",border:`1px solid ${order.status==="APPROVED"?"var(--green-border)":"var(--yellow-border)"}`}}>{order.status}</span>
                          {isSel&&<svg viewBox="0 0 20 20" fill="var(--accent)" width={18} height={18}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <button className="btn btn-primary" style={{padding:"9px 28px"}} onClick={()=>{
              if(type==="ADDITIONAL"&&!selectedOrderId){setError("Please select an existing order.");return;}
              setError("");setStep(1);
            }}>Next →</button>
          </div>
        </div>
      )}

      {/* STEP 1 */}
      {step===1&&(
        <div className="fade-in">
          {type==="ADDITIONAL"&&selectedOrderId&&(
            <div className="alert alert-info" style={{marginBottom:16,display:"flex",alignItems:"center",gap:10}}>
              <svg viewBox="0 0 20 20" fill="currentColor" width={16} height={16}><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>
              Details pre-filled from the original order for <strong>{selectedSchool?.name}</strong>. Edit anything as needed.
            </div>
          )}

          <div className="card" style={{marginBottom:16}}>
            <h2 style={{marginBottom:20}}>School Details</h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{gridColumn:"1 / -1"}}>
                <label className="form-label">School *</label>
                {type==="ADDITIONAL"?(
                  <div className="input" style={{background:"var(--bg)",color:"var(--text-secondary)",cursor:"default"}}>{selectedSchool?.name} — {selectedSchool?.city}</div>
                ):schoolsError?(
                  <p style={{color:"var(--red)",fontSize:13}}>{schoolsError}</p>
                ):(
                  <select className="input" value={schoolId} onChange={e=>setSchoolId(e.target.value)}>
                    <option value="">Select a school...</option>
                    {schools.map(s=><option key={s.id} value={s.id}>{s.name} — {s.city}</option>)}
                  </select>
                )}
              </div>
              <div style={{gridColumn:"1 / -1"}}><label className="form-label">Address Line 1</label><input className="input" placeholder="Street address" value={address1} onChange={e=>setAddress1(e.target.value)}/></div>
              <div style={{gridColumn:"1 / -1"}}><label className="form-label">Address Line 2</label><input className="input" placeholder="Area / locality" value={address2} onChange={e=>setAddress2(e.target.value)}/></div>
              <div><label className="form-label">Pin Code</label><input className="input" placeholder="e.g. 734001" value={pincode} onChange={e=>setPincode(e.target.value)}/></div>
              <div><label className="form-label">School Phone</label><input className="input" value={schoolPhone} onChange={e=>setSchoolPhone(e.target.value)}/></div>
              <div><label className="form-label">School Email</label><input className="input" type="email" value={schoolEmail} onChange={e=>setSchoolEmail(e.target.value)}/></div>
              <div>
                <label className="form-label">Product Type</label>
                <select className="input" value={productType} onChange={e=>setProductType(e.target.value)}>
                  <option value="ANNUAL">Annual</option>
                  <option value="PAPERBACKS_PLAINS">Paperbacks — Plains</option>
                  <option value="PAPERBACKS_HILLS">Paperbacks — Hills</option>
                  <option value="NUTSHELL_ANNUAL">Nutshell — Annual</option>
                  <option value="NUTSHELL_PAPERBACKS">Nutshell — Paperbacks</option>
                </select>
              </div>
              <div><label className="form-label">Order Date *</label><input className="input" type="date" value={orderDate} onChange={e=>setOrderDate(e.target.value)}/></div>
              <div><label className="form-label">Delivery Date</label><input className="input" type="date" value={deliveryDate} onChange={e=>setDeliveryDate(e.target.value)}/></div>
            </div>
          </div>

          <div className="card" style={{marginBottom:16}}>
            <h2 style={{marginBottom:6}}>Vendor Details</h2>
            <p style={{color:"var(--text-muted)",fontSize:13,margin:"0 0 14px"}}>Confirmation email sent to school and vendor email addresses.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div><label className="form-label">Vendor Name</label><input className="input" placeholder="e.g. ABC Books" value={vendorName} onChange={e=>setVendorName(e.target.value)}/></div>
              <div><label className="form-label">Vendor Phone</label><input className="input" value={vendorPhone} onChange={e=>setVendorPhone(e.target.value)}/></div>
              <div><label className="form-label">Vendor Email</label><input className="input" type="email" value={vendorEmail} onChange={e=>setVendorEmail(e.target.value)}/></div>
              <div><label className="form-label">Vendor Address</label><input className="input" value={vendorAddress} onChange={e=>setVendorAddress(e.target.value)}/></div>
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"space-between"}}>
            <button className="btn btn-secondary" onClick={()=>{setStep(0);setError("");}}>← Back</button>
            <button className="btn btn-primary" style={{padding:"9px 28px"}} onClick={()=>{if(validateStep1())setStep(2);}}>Next →</button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step===2&&(
        <div className="fade-in">
          <div className="card" style={{marginBottom:16}}>
            <h2 style={{marginBottom:6}}>Points of Contact</h2>
            <p style={{color:"var(--text-muted)",fontSize:13,margin:"0 0 14px"}}>Stored for reference. All optional.{type==="ADDITIONAL"&&" Pre-filled from original order."}</p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {pocs.map((poc,i)=>(
                <div key={poc.role} style={{border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:"12px 14px"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"var(--accent)",textTransform:"uppercase",letterSpacing:"0.05em",margin:"0 0 10px"}}>{poc.role}</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                    {(["name","phone","email"] as const).map(field=>(
                      <div key={field}>
                        <label className="form-label">{field.charAt(0).toUpperCase()+field.slice(1)}</label>
                        <input className="input" type={field==="email"?"email":"text"}
                          placeholder={field==="name"?"Full name":field==="phone"?"Phone":"Email"}
                          value={poc[field]}
                          onChange={e=>{const u=[...pocs];u[i]={...u[i],[field]:e.target.value};setPocs(u);}}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <h2 style={{margin:0}}>Book Quantities</h2>
                <p style={{color:"var(--text-muted)",fontSize:13,margin:"4px 0 0"}}>
                  {{
                    ANNUAL:               "Annual",
                    PAPERBACKS_PLAINS:    "Paperbacks — Plains",
                    PAPERBACKS_HILLS:     "Paperbacks — Hills",
                    NUTSHELL_ANNUAL:      "Nutshell — Annual",
                    NUTSHELL_PAPERBACKS:  "Nutshell — Paperbacks",
                  }[productType] ?? productType} pricing · Leave Agreed blank to use MRP
                </p>
              </div>
              {grossTotal>0&&(
                <div style={{background:"var(--accent-soft)",border:"1px solid var(--accent-border)",borderRadius:"var(--radius-lg)",padding:"8px 14px",textAlign:"right"}}>
                  <p style={{fontSize:10,color:"var(--accent)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",margin:"0 0 2px"}}>Gross Total</p>
                  <p style={{fontSize:"1.3rem",fontWeight:700,color:"var(--accent)",margin:0}}>₹{grossTotal.toLocaleString()}</p>
                </div>
              )}
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th style={{width:40}}></th><th>Class</th><th>MRP</th><th>Agreed Price</th><th>Quantity</th><th style={{textAlign:"right"}}>Amount</th></tr></thead>
                <tbody>
                  {rows.map(row=>{
                    const mrp=getMRP(row.classNum,productType);
                    const total=rowTotal(row);
                    return(
                      <tr key={row.classNum} style={{background:row.selected?"var(--accent-soft)":undefined,opacity:row.selected?1:0.6}}>
                        <td><input type="checkbox" checked={row.selected} onChange={e=>updateRow(row.classNum,"selected",e.target.checked)} style={{accentColor:"var(--accent)",width:15,height:15,cursor:"pointer"}}/></td>
                        <td style={{fontWeight:500}}>Class {row.classNum}</td>
                        <td style={{color:"var(--text-muted)",fontFamily:"monospace"}}>₹{mrp}</td>
                        <td><input type="number" className="input" disabled={!row.selected} placeholder={`₹${mrp}`} value={row.agreedPrice} onChange={e=>updateRow(row.classNum,"agreedPrice",e.target.value===""?"":Number(e.target.value))} style={{width:100,padding:"5px 8px",fontSize:13}}/></td>
                        <td><input type="number" className="input" disabled={!row.selected} placeholder="0" min={1} value={row.quantity} onChange={e=>updateRow(row.classNum,"quantity",e.target.value===""?"":Number(e.target.value))} style={{width:90,padding:"5px 8px",fontSize:13}}/></td>
                        <td style={{textAlign:"right",fontWeight:row.selected?600:400,fontFamily:"monospace"}}>{row.selected&&total>0?`₹${total.toLocaleString()}`:"—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {grossTotal>0&&<tfoot><tr style={{borderTop:"2px solid var(--border)"}}><td colSpan={5} style={{padding:"10px 16px",fontWeight:600,textAlign:"right"}}>Gross Total</td><td style={{padding:"10px 16px",fontWeight:700,fontFamily:"monospace",textAlign:"right",color:"var(--accent)",fontSize:"1rem"}}>₹{grossTotal.toLocaleString()}</td></tr></tfoot>}
              </table>
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"space-between"}}>
            <button className="btn btn-secondary" onClick={()=>{setStep(1);setError("");}}>← Back</button>
            <button className="btn btn-primary" style={{padding:"9px 28px"}} disabled={submitting||selected.length===0} onClick={handleSubmit}>
              {submitting?"Submitting...":"Submit Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
