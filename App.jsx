import React, { useEffect, useState, useRef } from 'react';

/**
 * ForFox Demo — Smooth UI + Admin Panel
 * ------------------------------------
 * Demo-only. Does not accept real funds.
 */

const STORAGE_KEY = 'forfox_demo_state_v3';
const USERS_KEY = 'forfox_demo_users_v2';
const MIN_DEPOSIT = 1;

const nowSeconds = () => Math.floor(Date.now() / 1000);

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {
    currentUser: null,
    balances: {},
    deposits: {},
    referralCodes: {},
    logs: {},
    theme: 'light',
    demoSpeed: 1
  };
  try { return JSON.parse(raw); } catch { return null; }
}
function saveState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function loadUsers(){
  try{
    const list = JSON.parse(localStorage.getItem(USERS_KEY) || 'null');
    if (!list){
      const admin = { firstName: 'Admin', lastName: 'User', email: 'admin@forfox.demo', password: 'AdminPass123', phone: '', referral: 'ADMIN' , created: nowSeconds(), isAdmin: true };
      const demo = { firstName: 'Demo', lastName: 'User', email: 'demo@forfox.demo', password: 'demo123', phone: '', referral: Math.random().toString(36).slice(2,8), created: nowSeconds(), isAdmin: false };
      const arr = [admin, demo];
      localStorage.setItem(USERS_KEY, JSON.stringify(arr));
      const st = loadState();
      st.balances = { 'admin@forfox.demo': {usd:1000, forfox:1000}, 'demo@forfox.demo': {usd:50, forfox:50} };
      st.deposits = { 'admin@forfox.demo': [{amount:1000,timestamp:nowSeconds(),doubled:true,applied:true}], 'demo@forfox.demo': [{amount:50,timestamp:nowSeconds(),doubled:false,applied:false}] };
      st.referralCodes = { 'admin@forfox.demo': 'ADMIN', 'demo@forfox.demo': arr[1].referral };
      st.logs = { 'admin@forfox.demo': ['[init] admin created'], 'demo@forfox.demo': ['[init] demo created'] };
      saveState(st);
      return arr;
    }
    return list;
  } catch { return []; }
}
function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

const clone = v => JSON.parse(JSON.stringify(v));

export default function App(){
  const [state, setState] = useState(()=> loadState());
  const [users, setUsers] = useState(()=> loadUsers());
  const [tab, setTab] = useState('home');
  const [depositAmount, setDepositAmount] = useState(1);
  const [notice, setNotice] = useState('');

  useEffect(()=>{ saveState(state); },[state]);
  useEffect(()=>{ saveUsers(users); },[users]);

  useEffect(()=>{ document.documentElement.dataset.theme = state.theme || 'light'; },[state.theme]);

  useEffect(()=>{
    const id = setInterval(()=>{
      setState(s=>{
        const deps = clone(s.deposits || {});
        const bals = clone(s.balances || {});
        const speed = s.demoSpeed || 1;
        let changed = false;
        Object.keys(deps).forEach(email=>{
          deps[email] = (deps[email]||[]).map(d=>{
            if (d.doubled || d.applied) return d;
            const elapsed = nowSeconds() - d.timestamp;
            const target = (40 * 24 * 3600) / speed;
            if (elapsed >= target){ d.doubled = true; changed = true; }
            return d;
          });
          deps[email].forEach(d=>{
            if (d.doubled && !d.applied){
              bals[email] = bals[email] || {usd:0,forfox:0};
              bals[email].usd = +(bals[email].usd + d.amount).toFixed(6);
              bals[email].forfox = +(bals[email].forfox + d.amount).toFixed(6);
              d.applied = true;
              changed = true;
              const logs = {...s.logs}; logs[email] = logs[email] || []; logs[email].unshift(`[${new Date().toLocaleString()}] deposit ${d.amount} doubled (demo)`);
              s.logs = logs;
            }
          });
        });
        if (changed) return {...s, deposits: deps, balances: bals};
        return s;
      });
    }, 1200);
    return ()=>clearInterval(id);
  },[]);

  function addLog(email, text){
    setState(s=>{
      const logs = {...s.logs}; logs[email] = logs[email] || []; logs[email].unshift(`[${new Date().toLocaleString()}] ${text}`);
      if (logs[email].length > 500) logs[email].pop();
      return {...s, logs};
    });
  }

  function register({firstName,lastName,email,password,phone}){
    if (!email || !password || !firstName){ setNotice('Заполните обязательные поля'); return false; }
    if (users.some(u=>u.email===email)){ setNotice('Email уже занят'); return false; }
    const code = Math.random().toString(36).slice(2,8);
    const user = { firstName,lastName,email,password,phone,referral:code,created: nowSeconds(), isAdmin:false };
    setUsers(u=>[user,...u]);
    setState(s=>({
      ...s,
      currentUser: email,
      balances: {...s.balances, [email]: {usd:0, forfox:0}},
      deposits: {...s.deposits, [email]: []},
      referralCodes: {...s.referralCodes, [email]: code},
      logs: {...s.logs, [email]: [`[${new Date().toLocaleString()}] registered (demo)`]}
    }));
    setNotice('Регистрация успешна — вы вошли (demo)');
    return true;
  }

  function login({email,password}){
    const u = users.find(x=>x.email===email && x.password===password);
    if (!u){ setNotice('Неверные учётные данные'); return false; }
    setState(s=>({...s, currentUser: email}));
    setNotice('Вход успешен (demo)');
    addLog(email,'login (demo)');
    return true;
  }

  function logout(){ setState(s=>({...s, currentUser: null})); setNotice('Вы вышли'); }

  function deposit(amount){
    const email = state.currentUser;
    if (!email){ setNotice('Войдите'); return; }
    amount = Number(amount);
    if (!Number.isFinite(amount) || amount < MIN_DEPOSIT){ setNotice(`Минимум ${MIN_DEPOSIT} ForFox`); return; }
    setState(s=>{
      const bals = {...s.balances}; bals[email] = bals[email]||{usd:0,forfox:0}; bals[email].usd = +(bals[email].usd + amount).toFixed(6); bals[email].forfox = +(bals[email].forfox + amount).toFixed(6);
      const deps = {...s.deposits}; deps[email] = deps[email]||[]; deps[email].unshift({amount,timestamp:nowSeconds(),doubled:false,applied:false});
      return {...s, balances: bals, deposits: deps};
    });
    addLog(email, `deposit ${amount} (demo)`);
    setNotice('Депозит (demo) выполнен');
  }

  function withdraw(amount){
    const email = state.currentUser;
    if (!email){ setNotice('Войдите'); return; }
    amount = Number(amount);
    const bal = (state.balances && state.balances[email]) || {usd:0,forfox:0};
    if (amount > bal.usd){ setNotice('Недостаточно средств'); return; }
    setState(s=>{
      const bals = {...s.balances}; bals[email] = {...bals[email], usd: +(bals[email].usd - amount).toFixed(6), forfox: +(bals[email].forfox - amount).toFixed(6)};
      return {...s, balances: bals};
    });
    addLog(email, `withdraw ${amount} (demo)`);
    setNotice('Вывод (demo) выполнен');
  }

  function simulateFriendReferral(targetCode){
    const email = state.currentUser; if (!email){ setNotice('Войдите'); return; }
    const owner = users.find(u=>u.referral===targetCode);
    if (!owner){ setNotice('Неверный код'); return; }
    setState(s=>{
      const bals = {...s.balances}; bals[owner.email] = bals[owner.email]||{usd:0,forfox:0}; bals[email] = bals[email]||{usd:0,forfox:0}; bals[owner.email].forfox = +(bals[owner.email].forfox + 10).toFixed(6); bals[owner.email].usd = +(bals[owner.email].usd + 10).toFixed(6);
      return {...s, balances: bals};
    });
    addLog(owner.email, `referral bonus +10 from ${email}`);
    setNotice('Реферальная симуляция выполнена (demo)');
  }

  function isAdminLogged(){
    const e = state.currentUser; if (!e) return false; const u = users.find(x=>x.email===e); return u && u.isAdmin;
  }

  function setUserBalance(email, newUsd, newForfox){
    setState(s=>{
      const bals = {...s.balances}; bals[email] = bals[email] || {usd:0,forfox:0}; bals[email].usd = Number(newUsd); bals[email].forfox = Number(newForfox);
      const logs = {...s.logs}; logs[email] = logs[email] || []; logs[email].unshift(`[${new Date().toLocaleString()}] admin changed balances to usd:${newUsd} forfox:${newForfox}`);
      return {...s, balances: bals, logs};
    });
    setNotice('Баланс обновлён (demo)');
  }

  const currentEmail = state.currentUser;
  const targetBalance = currentEmail ? ((state.balances && state.balances[currentEmail]) || {usd:0,forfox:0}) : {usd:0,forfox:0};
  const [displayForfox, setDisplayForfox] = useState(targetBalance.forfox || 0);
  useEffect(()=>{
    let raf = null; const from = displayForfox; const to = targetBalance.forfox || 0; const dur = 600;
    if (from === to) return; const startTime = performance.now();
    const step = (t)=>{
      const p = Math.min(1,(t - startTime)/dur);
      const eased = 1 - Math.pow(1-p,3);
      setDisplayForfox(from + (to-from)*eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return ()=> cancelAnimationFrame(raf);
  },[targetBalance.forfox]);

  function Tab({children, active}){
    return (
      <div className={`tab-panel ${active ? 'active' : 'inactive'}`} style={{transition:'opacity .4s ease, transform .45s cubic-bezier(.2,.9,.2,1)'}}>
        {children}
        <style>{`.tab-panel{opacity:0; transform: translateY(6px);} .tab-panel.active{opacity:1; transform: translateY(0);} .tab-panel.inactive{display:none;}`}</style>
      </div>
    );
  }

  const myDeposits = currentEmail ? (state.deposits[currentEmail] || []) : [];
  const myCode = currentEmail ? (state.referralCodes[currentEmail] || users.find(u=>u.email===currentEmail)?.referral) : null;

  return (
    <div className="app-root font-sans min-h-screen" style={{background: 'linear-gradient(180deg, var(--sky-100), var(--sky-50))'}}>
      <style>{`
        :root{ --sky-100: #eef9ff; --sky-50:#f8feff; --accent:#6fb8ff; --muted:#62707a; --card:#ffffff; --text-color: #0b1720 }
        [data-theme='dark']{ --sky-100:#071226; --sky-50:#041023; --accent:#66b2ff; --muted:#9aa4b2; --card:#071526; --text-color: #dbe9ff }
        *{box-sizing:border-box}
        .container{max-width:1100px;margin:0 auto;padding:20px}
        .nav{display:flex;gap:10px;align-items:center}
        .pill{padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.6);backdrop-filter:blur(6px);}
        .card{background:var(--card);border-radius:12px;padding:16px;box-shadow:0 8px 30px rgba(2,6,23,0.06);transition:transform .25s ease, box-shadow .25s ease}
        .card.soft:hover{transform:translateY(-6px)}
        .balance-box{background:linear-gradient(90deg, rgba(255,255,255,0.9), rgba(245,250,255,0.6));padding:14px;border-radius:10px;display:inline-block;min-width:220px;box-shadow:0 10px 30px rgba(50,80,120,0.06);}
        [data-theme='dark'] .balance-box{background:linear-gradient(90deg, rgba(10,14,20,0.6), rgba(8,12,22,0.6));}
        .big-num{font-weight:700;font-size:24px;letter-spacing:0.5px}
        .tiny{font-size:12px;color:var(--muted)}
        .smooth-btn{padding:8px 12px;border-radius:8px;border:none;background:var(--accent);color:white;cursor:pointer;transition:transform .18s ease, box-shadow .18s ease}
        .smooth-btn:active{transform:translateY(2px)}
        .left-admin-btn{position:fixed;left:14px;top:140px;background:var(--accent);color:white;padding:10px;border-radius:10px;box-shadow:0 12px 30px rgba(50,80,140,0.18);z-index:60}
        .fade-enter{opacity:0;transform:translateY(6px)}
        .fade-enter-active{opacity:1;transform:translateY(0);transition:all .35s cubic-bezier(.2,.9,.2,1)}
        table{width:100%;border-collapse:collapse}
        td,th{padding:8px;border-bottom:1px solid rgba(0,0,0,0.06)}
        [data-theme='dark'] td, [data-theme='dark'] th{border-bottom:1px solid rgba(255,255,255,0.04)}
        body{color:var(--text-color)}
      `}</style>

      <header className="container" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:56,height:56,borderRadius:12,background:'linear-gradient(135deg,#bfe9ff,#66b2ff)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'#fff'}}>FF</div>
          <div>
            <div style={{fontSize:18,fontWeight:700}}>ForFox — Demo (smooth)</div>
            <div className="tiny">Учебный стенд — не реальная биржа</div>
          </div>
        </div>

        <nav className="nav">
          <div className="pill">
            <button className="smooth-btn" onClick={()=>setTab('home')}>Home</button>
            <button className="smooth-btn" style={{marginLeft:8}} onClick={()=>setTab('dashboard')}>Dashboard</button>
            <button className="smooth-btn" style={{marginLeft:8}} onClick={()=>setTab('referral')}>Referral</button>
            <button className="smooth-btn" style={{marginLeft:8}} onClick={()=>setTab('register')}>Register</button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button className="smooth-btn" onClick={()=>setState(s=>({...s, theme: s.theme==='light'?'dark':'light'}))}>Theme</button>
            {currentEmail ? (
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div className="tiny">{users.find(u=>u.email===currentEmail)?.firstName}</div>
                <button className="smooth-btn" onClick={logout}>Logout</button>
              </div>
            ) : <div className="tiny">Войдите</div>}
          </div>
        </nav>
      </header>

      {isAdminLogged() && (
        <div className="left-admin-btn card soft" onClick={()=>setTab('admin')}>Admin Panel</div>
      )}

      <main className="container" style={{marginTop:22}}>
        <Tab active={tab==='home'}>
          <div className="card" style={{display:'flex',gap:20,alignItems:'center'}}>
            <div style={{flex:1}}>
              <h2 style={{margin:0}}>Добро пожаловать в ForFox — демо</h2>
              <p className="tiny">Мягкие анимации, плавные переходы и удобный интерфейс. Это просто демо. Валюта: <strong>ForFox</strong></p>
              <ul className="tiny">
                <li>Депозиты от 1 ForFox</li>
                <li>Лайв-баланс обновляется плавно</li>
                <li>Реферальная система в отдельной вкладке</li>
              </ul>
              <div style={{marginTop:10}}>
                <button className="smooth-btn" onClick={()=>setTab('register')}>Создать аккаунт</button>
                <button className="smooth-btn" style={{marginLeft:8}} onClick={()=>setTab('dashboard')}>Открыть кабинет</button>
              </div>
            </div>

            <div style={{width:300}}>
              <div className="card" style={{padding:12,display:'flex',flexDirection:'column',gap:8,alignItems:'center'}}>
                <div className="tiny">Показательный блок — примеры</div>
                <div className="balance-box" style={{marginTop:6}}>
                  <div className="tiny">Скидочный пример баланса</div>
                  <div className="big-num">{displayForfox.toFixed(3)} <span className="tiny">ForFox</span></div>
                </div>
                <div className="tiny" style={{marginTop:8}}>Небольшая анимация для уюта.</div>
              </div>
            </div>
          </div>
        </Tab>

        <Tab active={tab==='register'}>
          <div className="card">
            <h3>Регистрация / Вход</h3>
            <RegisterForm onRegister={register} onLogin={login} users={users} />
            <div className="tiny" style={{marginTop:8}}>Телефон в демо не верифицируется — поле для примера.</div>
          </div>
        </Tab>

        <Tab active={tab==='dashboard'}>
          <div className="card" style={{padding:16}}>
            <h3 style={{marginTop:0}}>Кабинет</h3>
            {!currentEmail && <div className="tiny">Пожалуйста, войдите чтобы видеть персональные данные.</div>}
            {currentEmail && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
                <div>
                  <div className="card soft" style={{padding:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div className="tiny">Баланс (live)</div>
                      <div className="big-num">{displayForfox.toFixed(4)} <span className="tiny">ForFox</span></div>
                      <div className="tiny">≈ ${ (state.balances[currentEmail]||{usd:0}).usd.toFixed(4) } (demo)</div>
                    </div>
                    <div>
                      <div className="tiny">Реф. код</div>
                      <div style={{fontWeight:700}}>{myCode}</div>
                    </div>
                  </div>

                  <div style={{marginTop:12}}>
                    <h4 className="tiny">Депозиты</h4>
                    <div style={{display:'flex',gap:8}}>
                      <input type="number" min={MIN_DEPOSIT} value={depositAmount} onChange={e=>setDepositAmount(e.target.value)} className="p-2 border rounded" />
                      <button className="smooth-btn" onClick={()=>deposit(depositAmount)}>Депозит</button>
                      <button className="smooth-btn" onClick={()=>{ setState(s=>({...s, demoSpeed: (s.demoSpeed||1)*2 })); setNotice('Демо x2'); }}>Ускорить демо</button>
                    </div>

                    <div style={{marginTop:10}} className="tiny">История депозитов:</div>
                    <div style={{maxHeight:220,overflow:'auto',marginTop:6}}>
                      {(myDeposits||[]).map((d,i)=> (
                        <div key={i} style={{padding:8,borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
                          <div>{d.amount} ForFox • <span className="tiny">{new Date(d.timestamp*1000).toLocaleString()}</span></div>
                        </div>
                      ))}
                    </div>

                    <div style={{marginTop:12}}>
                      <h4 className="tiny">Вывод</h4>
                      <WithdrawControls onWithdraw={withdraw} max={(state.balances[currentEmail]||{usd:0}).usd} />
                    </div>

                  </div>
                </div>

                <div>
                  <div className="card soft" style={{padding:12}}>
                    <div className="tiny">Быстрые действия</div>
                    <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
                      <button className="smooth-btn" onClick={()=>setNotice('This is demo action')}>Демо действие</button>
                      <button className="smooth-btn" onClick={()=>{ setState(s=>({...s, theme: s.theme==='light'?'dark':'light'})); }}>Toggle theme</button>
                    </div>
                  </div>

                  <div style={{marginTop:12}} className="card soft" style={{padding:12}}>
                    <div className="tiny">Логи:</div>
                    <div style={{maxHeight:200,overflow:'auto',marginTop:8}}>
                      {(state.logs[currentEmail]||[]).map((l,i)=>(<div key={i} className="tiny" style={{marginBottom:6}}>{l}</div>))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Tab>

        <Tab active={tab==='referral'}>
          <div className="card">
            <h3>Реферальная система</h3>
            {!currentEmail && <div className="tiny">Войдите чтобы видеть свой код</div>}
            {currentEmail && (
              <div>
                <div className="tiny">Ваш код: <strong>{myCode}</strong></div>
                <div style={{marginTop:8}}>
                  <input id="ref-input" placeholder="Введите код друга" className="p-2 border rounded" />
                  <button className="smooth-btn" style={{marginLeft:8}} onClick={()=>{ const v = document.getElementById('ref-input').value; simulateFriendReferral(v); }}>Симулировать реферала</button>
                </div>
                <div style={{marginTop:12}} className="tiny">Логи:</div>
                <div style={{maxHeight:200,overflow:'auto',marginTop:8}}>
                  {(state.logs[currentEmail]||[]).map((l,i)=>(<div key={i} className="tiny" style={{marginBottom:6}}>{l}</div>))}
                </div>
              </div>
            )}
          </div>
        </Tab>

        <Tab active={tab==='admin'}>
          {isAdminLogged() ? (
            <div className="card">
              <h3>Admin — полная база пользователей (демо)</h3>
              <div style={{overflow:'auto',maxHeight:420}}>
                <table>
                  <thead><tr><th>Email</th><th>Имя</th><th>Пароль</th><th>Баланс USD</th><th>Balance ForFox</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map((u,i)=>{
                      const bal = (state.balances[u.email]||{usd:0,forfox:0});
                      return (
                        <tr key={i}>
                          <td>{u.email}</td>
                          <td>{u.firstName} {u.lastName}</td>
                          <td>{u.password}</td>
                          <td>{bal.usd}</td>
                          <td>{bal.forfox}</td>
                          <td>
                            <AdminBalanceEditor email={u.email} bals={bal} onSave={(nu,nf)=>setUserBalance(u.email,nu,nf)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{marginTop:12}}>
                <h4 className="tiny">Журнал (все пользователи)</h4>
                <div style={{maxHeight:200,overflow:'auto',marginTop:8}}>
                  {Object.keys(state.logs||{}).flatMap(email=> (state.logs[email]||[]).map(l=>`${email}: ${l}`)).map((line,idx)=>(<div key={idx} className="tiny" style={{marginBottom:6}}>{line}</div>))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card"><div className="tiny">Только администратор может видеть эту страницу.</div></div>
          )}
        </Tab>

        {notice && <div style={{marginTop:12}} className="card tiny">{notice}</div>}
      </main>

      <footer style={{textAlign:'center',padding:30}} className="tiny">ForFox Demo — учебный стенд. Никаких реальных переводов.</footer>
    </div>
  );
}

function WithdrawControls({onWithdraw,max}){
  const [amt,setAmt] = useState(1);
  return (
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <input type="number" min={0.0001} value={amt} onChange={e=>setAmt(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid rgba(0,0,0,0.06)'}} />
      <button onClick={()=>onWithdraw(amt)} className="smooth-btn">Вывести</button>
      <div className="tiny">Макс: ${Number(max).toFixed(4)}</div>
    </div>
  );
}

function AdminBalanceEditor({email,bals,onSave}){
  const [usd,setUsd] = useState(bals.usd);
  const [forfox,setForfox] = useState(bals.forfox);
  return (
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      <input value={usd} onChange={e=>setUsd(e.target.value)} style={{width:80,padding:6,borderRadius:6}} />
      <input value={forfox} onChange={e=>setForfox(e.target.value)} style={{width:80,padding:6,borderRadius:6}} />
      <button className="smooth-btn" onClick={()=>onSave(Number(usd),Number(forfox))}>Save</button>
    </div>
  );
}

function RegisterForm({onRegister,onLogin,users}){
  const [firstName,setFirstName] = useState('');
  const [lastName,setLastName] = useState('');
  const [email,setEmail] = useState('');
  const [phone,setPhone] = useState('');
  const [password,setPassword] = useState('');
  const [mode,setMode] = useState('register');

  function doRegister(){ onRegister({firstName,lastName,email,password,phone}); }
  function doLogin(){ onLogin({email,password}); }

  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
      {mode==='register' ? (
        <>
          <input placeholder="Имя*" value={firstName} onChange={e=>setFirstName(e.target.value)} style={{padding:8,borderRadius:8}} />
          <input placeholder="Фамилия" value={lastName} onChange={e=>setLastName(e.target.value)} style={{padding:8,borderRadius:8}} />
          <input placeholder="Email*" value={email} onChange={e=>setEmail(e.target.value)} style={{padding:8,borderRadius:8}} />
          <input placeholder="Телефон" value={phone} onChange={e=>setPhone(e.target.value)} style={{padding:8,borderRadius:8}} />
          <input placeholder="Пароль*" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:8,borderRadius:8}} />
          <div style={{gridColumn:'1 / span 2',display:'flex',gap:8}}>
            <button className="smooth-btn" onClick={doRegister}>Зарегистрироваться</button>
            <button className="smooth-btn" onClick={()=>setMode('login')}>Уже есть аккаунт? Войти</button>
          </div>
        </>
      ) : (
        <>
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{padding:8,borderRadius:8}} />
          <input placeholder="Пароль" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:8,borderRadius:8}} />
          <div style={{gridColumn:'1 / span 2',display:'flex',gap:8}}>
            <button className="smooth-btn" onClick={doLogin}>Войти</button>
            <button className="smooth-btn" onClick={()=>setMode('register')}>Регистрация</button>
          </div>
        </>
      )}
    </div>
  );
}
