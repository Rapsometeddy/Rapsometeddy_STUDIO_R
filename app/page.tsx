"use client";
import {useEffect,useRef,useState} from "react";
const pads=["Kick","Snare","Hat","Clap","Bass","Chord","Pluck","Perc"],steps=16,sections=["INTRO","VERSE","HOOK","VERSE 2","BRIDGE","OUTRO"];
export default function Page(){
 const [bpm,setBpm]=useState(110),[key,setKey]=useState("C"),[playing,setPlaying]=useState(false),[volume,setVolume]=useState(.7),[exporting,setExporting]=useState(false),[exportStatus,setExportStatus]=useState("");
 const [pattern,setPattern]=useState<boolean[][]>(()=>pads.map((_,r)=>Array.from({length:steps},(_,c)=>[0,4,8,12].includes(c)&&r<4)));
 const [activeSection,setActiveSection]=useState("INTRO"),[song,setSong]=useState<Record<string,number>>(()=>Object.fromEntries(sections.map((s,i)=>[s,i===0?4:8])));
 const [title,setTitle]=useState("Untitled Rapsometeddy Track"),[lyrics,setLyrics]=useState(""),[aiPrompt,setAiPrompt]=useState(""),[aiBusy,setAiBusy]=useState(false),[aiResult,setAiResult]=useState("");
 const audio=useRef<AudioContext|null>(null),timer=useRef<number|null>(null),stepRef=useRef(0);
 function ctx(){audio.current??=new AudioContext();return audio.current}
 function tone(freq:number,dur=.12,type:OscillatorType="sine",gain=.08){const c=ctx(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain*volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+dur)}
 function hit(r:number){if(r===0){const c=ctx(),t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);g.gain.setValueAtTime(.28*volume,t);g.gain.exponentialRampToValueAtTime(.001,t+.14);o.connect(g).connect(c.destination);o.start();o.stop(t+.15)}else if(r===1||r===3)tone(r===1?180:300,.07,"triangle",.12);else if(r===2||r===7)tone(r===2?700:900,.045,"square",.045);else if(r===4)tone(55,.22,"sawtooth",.09);else if(r===5)[261.63,329.63,392].forEach(f=>tone(f,.35,"sine",.035));else tone(523.25,.18,"triangle",.07)}
 function start(){ctx().resume();if(timer.current)clearInterval(timer.current);stepRef.current=0;setPlaying(true);const tick=()=>{const s=stepRef.current%steps;pattern.forEach((row,r)=>row[s]&&hit(r));stepRef.current++};tick();timer.current=window.setInterval(tick,60000/bpm/4)}
 function stop(){if(timer.current)clearInterval(timer.current);timer.current=null;setPlaying(false)}
 useEffect(()=>()=>{if(timer.current)clearInterval(timer.current)},[]);
 function toggle(r:number,c:number){setPattern(p=>p.map((row,ri)=>ri===r?row.map((v,ci)=>ci===c?!v:v):row))}
 function filename(ext:string){return(title||"rapsometeddy-track").replace(/[^a-z0-9]+/gi,"-").toLowerCase()+"."+ext}
 function exportProject(){const blob=new Blob([JSON.stringify({title,bpm,key,sections:song,lyrics,pattern},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename("json");a.click();URL.revokeObjectURL(a.href)}
 async function generateAISong(){
   if(aiBusy||!aiPrompt.trim())return;
   setAiBusy(true);setAiResult("AI is generating your song…");
   try{
     const r=await fetch("/api/ai-song",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:aiPrompt,title})});
     const data=await r.json();
     if(data.audioUrl){setAiResult("AI song ready ✓");window.open(data.audioUrl,"_blank");}
     else setAiResult(data.error||"AI generation failed.");
   }catch{setAiResult("AI generation failed — check your Vercel AI key.");}
   finally{setAiBusy(false)}
 }
 function scheduleHit(c:OfflineAudioContext,r:number,at:number,vol:number){
   const gain=(v:number)=>Math.max(0,v*vol);
   const osc=(freq:number,dur:number,type:OscillatorType,g:number,slide?:number)=>{const o=c.createOscillator(),gn=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);if(slide)o.frequency.exponentialRampToValueAtTime(slide,at+dur*.85);gn.gain.setValueAtTime(gain(g),at);gn.gain.exponentialRampToValueAtTime(.001,at+dur);o.connect(gn).connect(c.destination);o.start(at);o.stop(at+dur)};
   if(r===0)osc(120,.14,"sine",.28,45);
   else if(r===1)osc(180,.07,"triangle",.12);
   else if(r===3)osc(300,.07,"triangle",.12);
   else if(r===2)osc(700,.045,"square",.045);
   else if(r===7)osc(900,.045,"square",.045);
   else if(r===4)osc(55,.22,"sawtooth",.09);
   else if(r===5)[261.63,329.63,392].forEach(f=>osc(f,.35,"sine",.035));
   else osc(523.25,.18,"triangle",.07);
 }
 function encodeWav(buffer:AudioBuffer){
   const channels=buffer.numberOfChannels,samples=buffer.length,rate=buffer.sampleRate,block=channels*2,dataSize=samples*block;
   const out=new ArrayBuffer(44+dataSize),view=new DataView(out);
   const str=(o:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i))};
   str(0,"RIFF");view.setUint32(4,36+dataSize,true);str(8,"WAVE");str(12,"fmt ");
   view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,rate,true);
   view.setUint32(28,rate*block,true);view.setUint16(32,block,true);view.setUint16(34,16,true);str(36,"data");view.setUint32(40,dataSize,true);
   let pos=44;for(let i=0;i<samples;i++)for(let ch=0;ch<channels;ch++){const s=Math.max(-1,Math.min(1,buffer.getChannelData(ch)[i]));view.setInt16(pos,s<0?s*0x8000:s*0x7fff,true);pos+=2}
   return new Blob([out],{type:"audio/wav"});
 }
 async function exportWav(){
   if(exporting)return;
   setExporting(true);setExportStatus("Rendering WAV…");
   try{
     const beatSeconds=60/bpm,barSeconds=beatSeconds*4,totalBars=sections.reduce((n,s)=>n+song[s],0),rate=44100;
     const off=new OfflineAudioContext(2,Math.ceil(Math.max(1,totalBars*barSeconds)*rate),rate);
     for(let bar=0;bar<totalBars;bar++)for(let s=0;s<steps;s++){const at=bar*barSeconds+s*(beatSeconds/4);pattern.forEach((row,r)=>row[s]&&scheduleHit(off,r,at,volume))}
     const rendered=await off.startRendering(),wav=encodeWav(rendered),url=URL.createObjectURL(wav),a=document.createElement("a");
     a.href=url;a.download=filename("wav");a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
     setExportStatus(`WAV exported ✓ • ${totalBars} bars • ${Math.round(totalBars*barSeconds)}s`);
   }catch(e){setExportStatus("WAV export failed — try again in Chrome.");}
   finally{setExporting(false)}
 }
 return <main><header><div className="brand"><span className="logo">R</span><div><b>RAPSOMETTEDY</b><small>STUDIO R</small></div></div><span className="badge">ORIGINAL MUSIC LAB</span></header>
 <section className="hero"><p className="eyebrow">CREATE • BEAT • SONG • EXPORT</p><input className="title" value={title} onChange={e=>setTitle(e.target.value)}/><h1>Build your sound.</h1><p>Turn a beat into a structured song. Browser instruments are generated in real time; no commercial recordings are included.</p></section>
 <section className="toolbar"><label>BPM<input type="number" min="60" max="200" value={bpm} onChange={e=>setBpm(Math.max(60,Math.min(200,+e.target.value||110)))}/></label><label>KEY<select value={key} onChange={e=>setKey(e.target.value)}>{["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"].map(k=><option key={k}>{k}</option>)}</select></label><label>VOLUME<input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(+e.target.value)}/></label><button className="primary" onClick={playing?stop:start}>{playing?"■ STOP":"▶ PLAY"}</button><button onClick={exportProject}>EXPORT PROJECT</button><button onClick={exportWav} disabled={exporting}>{exporting?"RENDERING…":"EXPORT WAV"}</button></section>
 {exportStatus&&<div className="exportStatus">{exportStatus}</div>}
 <section className="card aiCard"><div className="sectionTitle"><div><span className="eyebrow">AI SONG AUTOPILOT</span><h2>Describe it. AI builds it.</h2></div><span>FULL SONG</span></div><textarea className="lyrics" value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="Example: dark futuristic amapiano / trap song about building a dream from nothing, deep male vocal, catchy hook, cinematic intro, energetic beat switch…" maxLength={1200}/><button className="primary" onClick={generateAISong} disabled={aiBusy||!aiPrompt.trim()}>{aiBusy?"GENERATING…":"✨ GENERATE FULL SONG"}</button>{aiResult&&<div className="exportStatus">{aiResult}</div>}</section>
 <section className="card"><div className="sectionTitle"><div><span className="eyebrow">STEP SEQUENCER</span><h2>Beat Grid</h2></div><span>{bpm} BPM · {key}</span></div><div className="grid">{pads.map((p,r)=><div className="row" key={p}><div className="name">{p}</div>{pattern[r].map((on,c)=><button aria-label={p+" step "+(c+1)} className={on?"step on":"step"} onClick={()=>toggle(r,c)} key={c}><span>{c%4===0?c+1:""}</span></button>)}</div>)}</div></section>
 <section className="card arrange"><div className="sectionTitle"><div><span className="eyebrow">SONG ARRANGEMENT</span><h2>Build the structure</h2></div><span>{sections.length} sections</span></div><div className="sections">{sections.map(s=><button key={s} className={activeSection===s?"section active":"section"} onClick={()=>setActiveSection(s)}><b>{s}</b><span>{song[s]} bars</span></button>)}</div><div className="barEditor"><span>{activeSection} LENGTH</span><input type="range" min="2" max="32" value={song[activeSection]} onChange={e=>setSong({...song,[activeSection]:+e.target.value})}/><b>{song[activeSection]} bars</b></div></section>
 <section className="card"><div className="sectionTitle"><div><span className="eyebrow">SONGWRITING</span><h2>Lyrics & ideas</h2></div></div><textarea className="lyrics" value={lyrics} onChange={e=>setLyrics(e.target.value)} maxLength={5000} placeholder={"VERSE 1\nWrite your idea here...\n\nHOOK\nYour hook goes here..."} /><div className="count">{lyrics.length}/5000</div></section>
 <section className="cards"><article><span>🎹</span><h3>Original instruments</h3><p>Browser synth tones and drum voices are generated in real time.</p></article><article><span>🎤</span><h3>Vocals workspace</h3><p>Lyrics and song sections stay attached to the project.</p></article><article><span>📜</span><h3>Rights-first</h3><p>Third-party audio is never labelled royalty-free without a supporting license.</p></article></section><footer>👑 RAPSOMETTEDY • BUILD • LEARN • CREATE • INVEST</footer></main>
}