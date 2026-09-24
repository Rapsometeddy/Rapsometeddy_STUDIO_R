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
   try{const r=await fetch("/api/ai-song",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:aiPrompt,title})});const data=await r.json();if(data.audioUrl){setAiResult("AI song ready ✓");window.open(data.audioUrl,"_blank")}else setAiResult(data.error||"AI generation failed.")}
   catch{setAiResult("AI generation failed — check the AI provider setup.")}
   finally{setAiBusy(false)}
 }
 function scheduleHit(c:OfflineAudioContext,r:number,at:number,vol:number){
   const gain=(v:number)=>Math.max(0,v*vol);
   const osc=(freq:number,dur:number,type:OscillatorType,g:number,slide?:number)=>{const o=c.createOscillator(),gn=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);if(slide)o.frequency.exponentialRampToValueAtTime(slide,at+dur*.85);gn.gain.setValueAtTime(gain(g),at);gn.gain.exponentialRampToValueAtTime(.001,at+dur);o.connect(gn).connect(c.destination);o.start(at);o.stop(at+dur)};
   if(r===0)osc(120,.14,"sine",.28,45);else if(r===1)osc(180,.07,"triangle",.12);else if(r===3)osc(300,.07,"triangle",.12);else if(r===2)osc(700,.045,"square",.045);else if(r===7)osc(900,.045,"square",.045);else if(r===4)osc(55,.22,"sawtooth",.09);else if(r===5)[261.63,329.63,392].forEach(f=>osc(f,.35,"sine",.035));else osc(523.25,.18,"triangle",.07);
 }
 function encodeWav(buffer:AudioBuffer){
   const channels=buffer.numberOfChannels,samples=buffer.length,rate=buffer.sampleRate,block=channels*2,dataSize=samples*block,out=new ArrayBuffer(44+dataSize),view=new DataView(out);
   const str=(o:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i))};
   str(0,"RIFF");view.setUint32(4,36+dataSize,true);str(8,"WAVE");str(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,rate,true);view.setUint32(28,rate*block,true);view.setUint16(32,block,true);view.setUint16(34,16,true);str(36,"data");view.setUint32(40,dataSize,true);
   let pos=44;for(let i=0;i<samples;i++)for(let ch=0;ch<channels;ch++){const s=Math.max(-1,Math.min(1,buffer.getChannelData(ch)[i]));view.setInt16(pos,s<0?s*0x8000:s*0x7fff,true);pos+=2}return new Blob([out],{type:"audio/wav"});
 }
 async function exportWav(){
   if(exporting)return;setExporting(true);setExportStatus("Rendering WAV…");
   try{const beatSeconds=60/bpm,barSeconds=beatSeconds*4,totalBars=sections.reduce((n,s)=>n+song[s],0),rate=44100,off=new OfflineAudioContext(2,Math.ceil(Math.max(1,totalBars*barSeconds)*rate),rate);
   for(let bar=0;bar<totalBars;bar++)for(let s=0;s<steps;s++){const at=bar*barSeconds+s*(beatSeconds/4);pattern.forEach((row,r)=>row[s]&&scheduleHit(off,r,at,volume))}
   const rendered=await off.startRendering(),wav=encodeWav(rendered),url=URL.createObjectURL(wav),a=document.createElement("a");a.href=url;a.download=filename("wav");a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportStatus(`WAV exported ✓ • ${totalBars} bars • ${Math.round(totalBars*barSeconds)}s`);
   }catch{setExportStatus("WAV export failed — try again in Chrome.")}finally{setExporting(false)}
 }

 return <main>
  <header className="topbar">
   <div className="brand"><span className="logo">R</span><div><b>RAPSOMETTEDY</b><small>STUDIO R</small></div></div>
   <nav><a href="#create">CREATE</a><a href="#arrange">ARRANGE</a><a href="#lyrics">LYRICS</a><a href="#beat">BEAT</a></nav>
   <button className="headerAction" onClick={exportWav} disabled={exporting}>{exporting?"RENDERING…":"EXPORT"}</button>
  </header>

  <section className="generator" id="create">
   <div className="generatorCopy">
    <span className="eyebrow">👑 RAPSOMETTEDY MUSIC LAB</span>
    <h1>Make music.<br/><em>Your way.</em></h1>
    <p>Describe the sound in your head. Build the beat, shape the song, write the words, then export your project.</p>
   </div>
   <div className="generatorBox">
    <div className="boxTop"><span>AI SONG GENERATOR</span><span className="statusDot">● READY</span></div>
    <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder="Describe your song…&#10;&#10;Example: atmospheric amapiano with a dark futuristic mood, warm bass, catchy hook and a dramatic beat switch." maxLength={1200}/>
    <div className="quickTags"><button onClick={()=>setAiPrompt("Dark futuristic amapiano with a cinematic intro, warm bass and a catchy hook.")}>Amapiano</button><button onClick={()=>setAiPrompt("Melodic trap with a late-night mood, deep bass and a dramatic beat switch.")}>Trap</button><button onClick={()=>setAiPrompt("Dreamy lo-fi with soft chords, intimate vocals and a nostalgic atmosphere.")}>Lo-fi</button></div>
    <div className="generatorBottom"><span>{aiPrompt.length}/1200</span><button className="generate" onClick={generateAISong} disabled={aiBusy||!aiPrompt.trim()}>{aiBusy?"GENERATING…":"✨ GENERATE SONG"}</button></div>
    {aiResult&&<div className="result">{aiResult}</div>}
   </div>
  </section>

  <section className="controlStrip">
   <label><span>BPM</span><input type="number" min="60" max="200" value={bpm} onChange={e=>setBpm(Math.max(60,Math.min(200,+e.target.value||110)))}/></label>
   <label><span>KEY</span><select value={key} onChange={e=>setKey(e.target.value)}>{["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"].map(k=><option key={k}>{k}</option>)}</select></label>
   <label className="volume"><span>VOLUME</span><input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(+e.target.value)}/></label>
   <button className="play" onClick={playing?stop:start}>{playing?"■ STOP":"▶ PLAY"}</button>
   <button onClick={exportProject}>SAVE PROJECT</button>
   <button onClick={exportWav} disabled={exporting}>WAV</button>
  </section>
  {exportStatus&&<div className="notice">{exportStatus}</div>}

  <section className="workspaceGrid">
   <div className="card" id="arrange">
    <div className="sectionTitle"><div><span className="eyebrow">01 / ARRANGEMENT</span><h2>Shape your song</h2></div><span>{sections.length} sections</span></div>
    <div className="sections">{sections.map(s=><button key={s} className={activeSection===s?"section active":"section"} onClick={()=>setActiveSection(s)}><b>{s}</b><span>{song[s]} bars</span></button>)}</div>
    <div className="barEditor"><span>{activeSection} LENGTH</span><input type="range" min="2" max="32" value={song[activeSection]} onChange={e=>setSong({...song,[activeSection]:+e.target.value})}/><b>{song[activeSection]} bars</b></div>
   </div>
   <div className="card songInfo">
    <span className="eyebrow">02 / TRACK</span>
    <input className="trackTitle" value={title} onChange={e=>setTitle(e.target.value)}/>
    <p>Project settings stay attached to your song.</p>
    <div className="miniStats"><span><b>{bpm}</b>BPM</span><span><b>{key}</b>KEY</span><span><b>{sections.length}</b>PARTS</span></div>
   </div>
  </section>

  <section className="card beatCard" id="beat">
   <div className="sectionTitle"><div><span className="eyebrow">03 / BEAT</span><h2>Build the groove</h2></div><span>{bpm} BPM · {key}</span></div>
   <div className="grid">{pads.map((p,r)=><div className="row" key={p}><div className="name">{p}</div>{pattern[r].map((on,c)=><button aria-label={p+" step "+(c+1)} className={on?"step on":"step"} onClick={()=>toggle(r,c)} key={c}><span>{c%4===0?c+1:""}</span></button>)}</div>)}</div>
  </section>

  <section className="card" id="lyrics">
   <div className="sectionTitle"><div><span className="eyebrow">04 / LYRICS</span><h2>Write the song</h2></div><span>{lyrics.length}/5000</span></div>
   <textarea className="lyrics" value={lyrics} onChange={e=>setLyrics(e.target.value)} maxLength={5000} placeholder={"VERSE 1\nWrite your idea here…\n\nHOOK\nYour hook goes here…"}/>
  </section>

  <section className="featureRow">
   <article><span>✦</span><div><b>AI-first workflow</b><p>Start with an idea instead of a blank project.</p></div></article>
   <article><span>◈</span><div><b>Original browser beat</b><p>Build and preview a pattern directly on your phone.</p></div></article>
   <article><span>↗</span><div><b>Export when ready</b><p>Save the project or render the arranged beat to WAV.</p></div></article>
  </section>

  <footer>👑 RAPSOMETTEDY STUDIO R <span>BUILD • LEARN • CREATE • INVEST</span></footer>
 </main>
}
