"use client";
import {useEffect,useRef,useState} from "react";

const pads=["Kick","Snare","Hat","Clap","Bass","Chord","Pluck","Perc"];
const steps=16;

export default function Page(){
 const [bpm,setBpm]=useState(110),[key,setKey]=useState("C"),[playing,setPlaying]=useState(false),[pattern,setPattern]=useState<boolean[][]>(()=>pads.map((_,r)=>Array.from({length:steps},(_,c)=>[0,4,8,12].includes(c)&&r<4))),[volume,setVolume]=useState(0.7);
 const audio=useRef<AudioContext|null>(null),timer=useRef<number|null>(null),stepRef=useRef(0);
 function ctx(){audio.current??=new AudioContext(); return audio.current}
 function tone(freq:number,dur=.12,type:OscillatorType="sine",gain=.08){const c=ctx(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain*volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+dur)}
 function hit(r:number){const c=ctx(),t=c.currentTime; if(r===0){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(45,t+.12);g.gain.setValueAtTime(.28*volume,t);g.gain.exponentialRampToValueAtTime(.001,t+.14);o.connect(g).connect(c.destination);o.start();o.stop(t+.15)}else if(r===1||r===3){tone(r===1?180:300,.07,"triangle",.12)}else if(r===2||r===7){tone(r===2?700:900,.045,"square",.045)}else if(r===4){tone(55,.22,"sawtooth",.09)}else if(r===5){[261.63,329.63,392].forEach(f=>tone(f,.35,"sine",.035))}else if(r===6){tone(523.25,.18,"triangle",.07)}}
 function start(){ctx().resume(); if(timer.current)clearInterval(timer.current); stepRef.current=0; setPlaying(true); const tick=()=>{const s=stepRef.current%steps;pattern.forEach((row,r)=>row[s]&&hit(r));stepRef.current++;};tick();timer.current=window.setInterval(tick,60000/bpm/4)}
 function stop(){if(timer.current)clearInterval(timer.current);timer.current=null;setPlaying(false)}
 useEffect(()=>()=>{if(timer.current)clearInterval(timer.current)},[]);
 function toggle(r:number,c:number){setPattern(p=>p.map((row,ri)=>ri===r?row.map((v,ci)=>ci===c?!v:v):row))}
 function exportPattern(){const blob=new Blob([JSON.stringify({bpm,key,pattern},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="rapsometeddy-beat.json";a.click();URL.revokeObjectURL(a.href)}
 return <main><header><div className="brand"><span className="logo">R</span><div><b>RAPSOMETTEDY</b><small>STUDIO R</small></div></div><span className="badge">ORIGINAL MUSIC LAB</span></header>
 <section className="hero"><p className="eyebrow">CREATE • BEAT • SONG • EXPORT</p><h1>Build your sound.</h1><p>Mobile-first beat making with original browser instruments. No commercial recordings built in.</p></section>
 <section className="toolbar"><label>BPM<input type="number" min="60" max="200" value={bpm} onChange={e=>setBpm(+e.target.value||110)}/></label><label>KEY<select value={key} onChange={e=>setKey(e.target.value)}>{["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"].map(k=><option key={k}>{k}</option>)}</select></label><label>VOLUME<input type="range" min="0" max="1" step=".01" value={volume} onChange={e=>setVolume(+e.target.value)}/></label><button className="primary" onClick={playing?stop:start}>{playing?"■ STOP":"▶ PLAY"}</button><button onClick={exportPattern}>EXPORT PATTERN</button></section>
 <section className="card"><div className="sectionTitle"><div><span className="eyebrow">STEP SEQUENCER</span><h2>Beat Grid</h2></div><span>{bpm} BPM · {key}</span></div><div className="grid">{pads.map((p,r)=><div className="row" key={p}><div className="name">{p}</div>{pattern[r].map((on,c)=><button aria-label={p+" step "+(c+1)} className={on?"step on":"step"} onClick={()=>toggle(r,c)} key={c}><span>{c%4===0?c+1:""}</span></button>)}</div>)}</div></section>
 <section className="cards"><article><span>🎹</span><h3>Original instruments</h3><p>Browser synth tones and drum voices are generated in real time.</p></article><article><span>🎤</span><h3>Vocals next</h3><p>Keep lyrics, song sections and vocal workflows in the same project.</p></article><article><span>📜</span><h3>Rights-first</h3><p>Third-party audio is never labelled royalty-free without a supporting license.</p></article></section>
 <footer>👑 RAPSOMETTEDY • BUILD • LEARN • CREATE • INVEST</footer></main>
}