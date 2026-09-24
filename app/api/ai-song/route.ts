import {NextRequest,NextResponse} from "next/server";
export const runtime="nodejs";
const API="https://api.suno.com";
export async function POST(req:NextRequest){
 const key=process.env.SUNO_API_KEY;
 if(!key)return NextResponse.json({error:"SUNO_API_KEY is not configured in Vercel."},{status:503});
 try{
  const body=await req.json();
  const prompt=String(body.prompt||"").trim();
  const title=String(body.title||"Rapsometeddy Track").trim();
  const instrumental=Boolean(body.instrumental);
  if(!prompt)return NextResponse.json({error:"Describe the song first."},{status:400});
  const create=await fetch(API+"/v0/audio",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(instrumental?{description:prompt,title,instrumental:true}:{description:prompt,title})});
  const created=await create.json();
  if(!create.ok)return NextResponse.json({error:created?.error||created?.message||"AI generation request failed."},{status:create.status});
  const id=created?.id||created?.task_id;
  if(!id)return NextResponse.json({error:"AI provider returned no generation ID."},{status:502});
  for(let i=0;i<30;i++){
   await new Promise(r=>setTimeout(r,3000));
   const statusRes=await fetch(API+"/v0/audio/"+encodeURIComponent(id),{headers:{Authorization:"Bearer "+key}});
   const status=await statusRes.json();
   if(!statusRes.ok)return NextResponse.json({error:status?.error||"Could not check generation status."},{status:502});
   if(status?.status==="complete"||status?.status==="streaming"){
    if(status.audio_url)return NextResponse.json({id,status:status.status,audioUrl:status.audio_url,title:status.title||title});
   }
   if(status?.status==="error")return NextResponse.json({error:status.error||"AI generation failed."},{status:502});
  }
  return NextResponse.json({error:"Generation is still processing. Try again shortly.",id},{status:202});
 }catch(e){return NextResponse.json({error:"AI generation service is unavailable right now."},{status:502})}
}