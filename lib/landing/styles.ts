export const HOME_CSS = String.raw`
:root{--ink:#2a2340;--mute:#6b6680;--pink:#d63a74;--pink2:#ed4f88;--coral:#ee6a73;--purple:#6a63d9;--soft:#fff5f9;--sky:#eef3ff;--line:#ece7f5;--card:#fff;--r:20px}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:#fff;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5}
a{color:inherit;text-decoration:none}button,input,select{font:inherit;color:inherit}button{cursor:pointer}
img{max-width:100%}
:focus-visible{outline:3px solid var(--purple);outline-offset:2px}
.wrap{max-width:1240px;margin:auto;padding:0 20px}
.serif{font-family:Georgia,"Times New Roman",serif}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}

.bar{background:linear-gradient(100deg,#d63a74,#ee6a73 50%,#6a63d9);color:#fff;text-align:center;font-size:13px;font-weight:600;padding:9px 16px;letter-spacing:.02em}
.hd{position:sticky;top:0;z-index:30;background:#ffffffee;backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.hdIn{display:flex;align-items:center;gap:16px;min-height:72px}
.logo{font:700 24px/1 Georgia,serif;letter-spacing:-.04em;white-space:nowrap}.logo span{color:var(--pink2)}
.srch{flex:1;max-width:460px;margin:0 auto;position:relative}
.srch input{width:100%;border:1px solid var(--line);background:var(--soft);border-radius:999px;padding:11px 18px 11px 42px;font-size:14px}
.srch svg{position:absolute;left:15px;top:50%;transform:translateY(-50%);width:17px;height:17px;color:var(--mute)}
.hdAct{display:flex;align-items:center;gap:10px;margin-left:auto}
.hdAct select{border:1px solid var(--line);background:#fff;border-radius:999px;padding:9px 10px;font-size:13px}
.btnBag{background:var(--ink);color:#fff;border:0;border-radius:999px;padding:11px 18px;font-weight:700;font-size:14px;display:flex;gap:8px;align-items:center}
.btnBag b{background:var(--pink2);border-radius:99px;min-width:21px;height:21px;display:inline-grid;place-items:center;font-size:12px;padding:0 5px}
.nv{border-top:1px solid var(--line)}
.nvIn{display:flex;gap:6px;justify-content:center;overflow-x:auto;scrollbar-width:none}
.nvIn a{padding:13px 16px;font-size:14px;font-weight:700;white-space:nowrap;color:#4a4463;border-bottom:3px solid transparent}
.nvIn a:hover{color:var(--pink);border-color:var(--pink2)}

/* hero + 3D scene */
.hero{background:radial-gradient(circle at 78% 30%,#f3e6ff,transparent 34%),radial-gradient(circle at 8% 78%,#ffeef5,transparent 36%),linear-gradient(125deg,#fff 5%,#fff6fa 48%,#eef3ff);overflow:hidden}
.heroIn{display:grid;grid-template-columns:1fr 1.05fr;align-items:center;gap:20px;min-height:600px}
.heroCopy{padding:50px 0}
.kick{display:inline-block;background:#fff;border:1px solid #f3d3e2;color:var(--pink);font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;padding:8px 14px;border-radius:99px;margin-bottom:20px}
h1{font:400 clamp(40px,5.4vw,72px)/1.02 Georgia,serif;letter-spacing:-.05em;margin:0 0 16px}
h1 em{color:var(--pink2);font-style:italic}
.lead{font-size:18px;color:var(--mute);margin:0 0 28px;max-width:440px}
.cta{display:flex;gap:12px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:999px;padding:15px 28px;font-weight:800;font-size:15px;border:0}
.btnP{background:linear-gradient(110deg,var(--pink),var(--coral));color:#fff;box-shadow:0 14px 28px -10px #d63a7488;transition:transform .2s,box-shadow .2s}
.btnP:hover{transform:translateY(-2px);box-shadow:0 18px 32px -10px #d63a74aa}
.btnS{background:#fff;color:var(--ink);border:1.5px solid #d9cfee}
.btnS:hover{border-color:var(--purple)}
.trust{display:flex;gap:18px;flex-wrap:wrap;margin-top:26px;font-size:13px;font-weight:700;color:#5a5373}
.trust span:before{content:"✓";color:var(--pink2);margin-right:6px}

.scene{perspective:1100px;position:relative;height:560px;display:grid;place-items:center}
.stage{position:relative;width:min(470px,92%);height:100%;transform-style:preserve-3d;transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .18s ease-out}
.arch{position:absolute;left:50%;bottom:0;width:78%;height:88%;transform:translateX(-50%) translateZ(-60px);border-radius:999px 999px 28px 28px;background:linear-gradient(160deg,#fde6ef,#e6e9ff 60%,#dff4ff);box-shadow:0 40px 80px -30px #7b6bb355}
.woman{position:absolute;left:50%;bottom:0;width:86%;transform:translateX(-50%) translateZ(40px);filter:drop-shadow(0 26px 22px #4a2d6a33)}
.woman svg,.woman img{display:block;width:100%;height:auto}
.woman img{border-radius:999px 999px 28px 28px;object-fit:cover;aspect-ratio:4/5}
.fl{position:absolute;width:104px;filter:drop-shadow(0 18px 18px #4a2d6a30);animation:bob 6s ease-in-out infinite}
.fl svg{display:block;width:100%}
.f1{left:-4%;top:10%;transform:translateZ(110px) rotate(-12deg);animation-delay:-1s}
.f2{right:-2%;top:2%;width:92px;transform:translateZ(90px) rotate(10deg);animation-delay:-3s}
.f3{right:-6%;bottom:18%;width:118px;transform:translateZ(130px) rotate(-6deg);animation-delay:-2s}
.chip3d{position:absolute;left:-6%;bottom:22%;transform:translateZ(150px);background:#fff;border-radius:16px;padding:12px 16px;box-shadow:0 18px 40px -12px #4a2d6a40;font-weight:800;font-size:14px;line-height:1.2}
.chip3d small{display:block;color:var(--mute);font-weight:600;font-size:11px}
.chip3d b{color:var(--pink)}
@keyframes bob{0%,100%{translate:0 0}50%{translate:0 -14px}}

/* categories */
section{padding:56px 0}
.hdg{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:24px}
h2{font:400 clamp(28px,3.4vw,42px)/1.1 Georgia,serif;letter-spacing:-.04em;margin:0}
.hdg a{font-weight:800;font-size:14px;color:var(--pink)}
.cats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.cat{display:flex;flex-direction:column;justify-content:space-between;gap:14px;min-height:180px;padding:22px;border-radius:var(--r);border:1px solid var(--line);background:var(--c,#f9e9f4);text-align:left;transition:transform .25s,box-shadow .25s;transform-style:preserve-3d}
.cat i{font-style:normal;font-size:54px;line-height:1;transform:translateZ(40px)}
.cat b{font:400 22px Georgia,serif;transform:translateZ(24px)}
.cat small{display:block;color:var(--mute);font:600 12px Inter,sans-serif;margin-top:2px}
.cat:hover{box-shadow:0 24px 44px -18px #5a3f8a44}

/* shop */
.mq{display:none;width:100%;border:1px solid var(--line);background:var(--soft);border-radius:999px;padding:11px 18px;font-size:14px;margin-bottom:14px}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.tab,.chipf{border:1px solid #e5def2;background:#fff;border-radius:99px;padding:10px 18px;font-weight:800;font-size:14px}
.tab[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:20px;scrollbar-width:thin}
.chipf{padding:7px 14px;font-size:12px;white-space:nowrap;color:#4a4463}
.chipf[aria-pressed=true]{background:var(--pink2);border-color:var(--pink2);color:#fff}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.pc{background:var(--card);border:1px solid #efe9f6;border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column;transition:transform .25s,box-shadow .25s;transform-style:preserve-3d;will-change:transform}
.pc[hidden]{display:none}
.pc:hover{box-shadow:0 26px 44px -20px #5a3f8a55}
.ph{position:relative;display:grid;place-items:center;aspect-ratio:1/1;font-size:72px;overflow:hidden}
.ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .5s}
.pc:hover .ph img{transform:scale(1.06)}
.tg{position:absolute;top:12px;left:12px;background:#fff;border-radius:7px;padding:5px 9px;font:800 10px Inter,sans-serif;letter-spacing:.07em;text-transform:uppercase;box-shadow:0 4px 10px #0000000f;z-index:2}
.off{position:absolute;top:12px;right:12px;background:var(--pink);color:#fff;border-radius:99px;padding:5px 10px;font:800 12px Inter,sans-serif;z-index:2}
.pi{padding:14px 16px 16px;display:flex;flex-direction:column;gap:10px;flex:1}
.pn{font-weight:700;font-size:15px;line-height:1.3;min-height:40px}
.pb{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto}
.pr{font-weight:800;font-size:16px}.pr s{color:#9a94ad;font-weight:600;font-size:13px;margin-right:6px}.pr .ask{font-size:13px;color:var(--mute);font-weight:700}
.add{background:var(--ink);color:#fff;border:0;border-radius:99px;padding:10px 18px;font-weight:800;font-size:13px;transition:background .2s,transform .2s;white-space:nowrap}
.add:hover{background:var(--pink)}.add:active{transform:scale(.95)}
.add.ghost{background:#fff;color:var(--ink);border:1.5px solid #d9cfee}
.none{grid-column:1/-1;text-align:center;color:var(--mute);padding:40px 0}

/* custom band */
.band{background:linear-gradient(125deg,#3a2d63,#6a52a3);color:#fff;padding:44px 0}
.bandIn{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap}
.band h2{color:#fff}.band p{margin:8px 0 0;color:#e9defa}

/* reviews */
.rv{background:linear-gradient(180deg,#fff,var(--soft))}
.rvTop{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:26px}
.score{display:flex;align-items:center;gap:14px}
.score b{font:400 56px/1 Georgia,serif}
.stars{color:#f5a623;letter-spacing:2px;font-size:18px;white-space:nowrap}
.score small{display:block;color:var(--mute);font-weight:600;font-size:13px}
.rvGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.rc{background:#fff;border:1px solid #efe9f6;border-radius:var(--r);padding:22px;display:flex;flex-direction:column;gap:10px;transition:transform .25s,box-shadow .25s}
.rc:hover{box-shadow:0 22px 40px -20px #5a3f8a44}
.rc p{margin:0;color:#4a4463;font-size:15px}
.rc b{font-size:15px}
.rc footer{margin-top:auto;font-size:13px;color:var(--mute);font-weight:600;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.ver{background:#e4f8ef;color:#12805a;border-radius:99px;padding:2px 9px;font-size:11px;font-weight:800}
.empty{background:#fff;border:1px dashed #e0d5f1;border-radius:var(--r);padding:34px;text-align:center;color:var(--mute)}

/* footer */
.ft{background:#faf0f7;padding:36px 0 90px;font-size:14px}
.ftIn{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}
.ft nav{display:flex;gap:6px 22px;flex-wrap:wrap;font-weight:600;color:#5a5373}
.ft a:hover{color:var(--pink)}
.ft small{color:var(--mute);display:block;margin-top:6px}

/* bag */
.shade{display:none;position:fixed;inset:0;background:#1b1522a8;z-index:60}.shade.open{display:block}
.drawer{position:fixed;right:0;top:0;height:100%;width:min(420px,100%);background:#fff;z-index:61;transform:translateX(102%);transition:transform .25s;display:flex;flex-direction:column}
.drawer.open{transform:none}
.dh{display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid var(--line);font-weight:800;font-size:18px}
.dh button{background:none;border:0;font-size:28px;line-height:1}
.db{flex:1;overflow:auto;padding:8px 22px}
.ln{display:flex;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}
.ln .th{width:54px;height:54px;border-radius:12px;display:grid;place-items:center;font-size:24px;overflow:hidden;flex:none;position:relative}
.ln .th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ln .t{flex:1;min-width:0;font-weight:700;font-size:14px}.ln .t small{display:block;color:var(--mute);font-weight:600}
.q{display:flex;align-items:center;gap:8px}.q button{width:28px;height:28px;border-radius:50%;border:1px solid #ddd3ee;background:#fff;font-weight:800}
.df{padding:18px 22px;border-top:1px solid var(--line)}
.sum{display:flex;justify-content:space-between;font-weight:800;font-size:18px;margin-bottom:12px}
.df .btn{width:100%}.df small{display:block;text-align:center;color:var(--mute);margin-top:10px;font-size:12px}
.bagBar{position:fixed;left:12px;right:12px;bottom:12px;z-index:40;display:none;align-items:center;justify-content:space-between;background:var(--ink);color:#fff;border-radius:99px;padding:12px 12px 12px 22px;font-weight:800;box-shadow:0 18px 40px -10px #000a}
.bagBar.on{display:flex}.bagBar a{background:linear-gradient(110deg,var(--pink),var(--coral));border-radius:99px;padding:11px 20px}
.toast{position:fixed;left:50%;top:84px;transform:translate(-50%,-20px);background:var(--ink);color:#fff;border-radius:99px;padding:11px 20px;font-weight:700;font-size:14px;opacity:0;pointer-events:none;transition:.25s;z-index:70}
.toast.on{opacity:1;transform:translate(-50%,0)}
.wa{position:fixed;right:16px;bottom:84px;z-index:39;width:52px;height:52px;border-radius:50%;background:#25d366;display:grid;place-items:center;box-shadow:0 12px 26px -8px #0007;font-size:26px}

.rise{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.2,.8,.2,1),transform .7s cubic-bezier(.2,.8,.2,1)}
.rise.in{opacity:1;transform:none}

/* splash */
#splash{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:radial-gradient(circle at 78% 28%,#f3e6ff,transparent 36%),radial-gradient(circle at 12% 74%,#ffeef5,transparent 38%),linear-gradient(125deg,#fff,#fff6fa 48%,#eef3ff);transition:opacity .6s cubic-bezier(.2,.8,.2,1),visibility .6s;perspective:900px;cursor:pointer}
#splash.out{opacity:0;visibility:hidden}
.spStage{position:relative;width:min(300px,70vw);aspect-ratio:1;transform-style:preserve-3d;animation:spTurn 2.2s cubic-bezier(.2,.8,.2,1) both}
.spSheet{position:absolute;inset:0;border-radius:26px;background:linear-gradient(145deg,#fffffff2,#fde8f1f2 55%,#e8efffee);box-shadow:0 40px 70px -30px #7b6bb388,inset 0 0 0 1px #fff;display:grid;place-items:center;overflow:hidden}
.spSheet:after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 36%,#ffffffcc 48%,transparent 60%);transform:translateX(-120%);animation:spShine 1.6s .6s ease-out forwards}
.spSheet svg{width:78%;height:78%}
.spCut path,.spCut circle,.spCut ellipse{stroke-dasharray:1;stroke-dashoffset:1;animation:spDraw 1.1s .15s ease-out forwards}
.spFill{opacity:0;transform-origin:center;animation:spPaint .7s .95s cubic-bezier(.2,.8,.2,1) forwards}
.spDot{position:absolute;width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px #ee4f8566,0 0 24px 8px #ee4f85aa;left:50%;top:14%;animation:spLaser 1.1s .15s ease-in-out forwards;opacity:0}
.spOrb{position:absolute;inset:-14%;transform-style:preserve-3d;animation:spOrbit 3s linear infinite}
.spOrb span{position:absolute;left:50%;top:50%;font-size:26px;transform:rotateY(var(--a)) translateZ(235px) rotateY(calc(var(--a) * -1)) translate(-50%,-50%)}
.spBrand{position:absolute;left:50%;bottom:-62px;transform:translateX(-50%);white-space:nowrap;font:700 24px Georgia,serif;letter-spacing:-.03em;opacity:0;animation:spIn .6s 1.1s forwards}
.spBrand i{color:var(--pink2)}
.spBar{position:absolute;left:50%;bottom:9%;width:min(220px,50vw);height:4px;border-radius:9px;background:#eadff3;transform:translateX(-50%);overflow:hidden}
.spBar:after{content:"";display:block;height:100%;width:100%;background:linear-gradient(90deg,#d63a74,#6a63d9);transform:translateX(-100%);animation:spBar 1.5s ease-out forwards}
@keyframes spTurn{0%{transform:rotateY(-80deg) rotateX(18deg) scale(.7)}60%{transform:rotateY(8deg) rotateX(-4deg) scale(1)}100%{transform:rotateY(0) rotateX(0) scale(1)}}
@keyframes spDraw{to{stroke-dashoffset:0}}
@keyframes spPaint{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
@keyframes spShine{to{transform:translateX(120%)}}
@keyframes spIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes spBar{to{transform:none}}
@keyframes spOrbit{to{transform:rotateY(360deg)}}
@keyframes spLaser{0%{opacity:1;transform:translate(-50%,0)}50%{opacity:1;transform:translate(70px,60px)}100%{opacity:0;transform:translate(-50%,120px)}}

@media(max-width:1000px){.grid{grid-template-columns:repeat(3,1fr)}.rvGrid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:820px){
  .heroIn{grid-template-columns:1fr;min-height:0}.heroCopy{padding:34px 0 0;text-align:center}.lead{margin-left:auto;margin-right:auto}.cta,.trust{justify-content:center}
  .scene{height:430px}.mq{display:block}.cats{grid-template-columns:repeat(2,1fr)}.srch{display:none}.logo{font-size:21px}
  .nvIn{justify-content:flex-start}
}
@media(max-width:620px){.grid{grid-template-columns:repeat(2,1fr);gap:12px}.rvGrid{grid-template-columns:1fr}.ph{font-size:56px}.pi{padding:11px 12px 13px}.pn{font-size:14px;min-height:36px}.pb{flex-wrap:wrap}.add{padding:9px 14px}section{padding:40px 0}.btnBag span.w{display:none}.hdAct select{max-width:76px}.wrap{padding:0 14px}.scene{height:380px}.f1,.f3{width:82px}.f2{width:72px}.cat{min-height:150px;padding:16px}.cat i{font-size:42px}.cat b{font-size:18px}.chip3d{left:0;font-size:12px;padding:9px 12px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}.rise{opacity:1;transform:none}html{scroll-behavior:auto}.spCut path,.spCut circle,.spCut ellipse{stroke-dashoffset:0}.spFill{opacity:1}}
`;
