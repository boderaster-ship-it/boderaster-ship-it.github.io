export const HELIX={
id:'helix',name:'HELIX RESEARCH ARRAY',lootName:'SINGULARITY CORE',tagline:'ALIGN THE VECTOR LOCKS. STEAL THE CORE.',baseScore:11800,
theme:{id:'helix',floor:'#090713',floor2:'#17102a',wall:'#34245a',wall2:'#151027',bridge:'#6248a0',line:'rgba(226,158,255,.22)',zone:'rgba(169,94,255,.08)',accent:'#d99cff',accent2:'#69f5ff',security:'#ff4e91',ambient:[185,277,370],webglMix:1},
solids:[
{x:210,y:42,w:18,h:190,kind:'wall'},{x:210,y:328,w:18,h:190,kind:'wall'},
{x:430,y:100,w:18,h:180,kind:'spine'},{x:430,y:370,w:18,h:148,kind:'spine'},
{x:650,y:42,w:18,h:150,kind:'wall'},{x:650,y:282,w:18,h:236,kind:'wall'},
{x:228,y:270,w:182,h:16,kind:'bridge'},{x:468,y:330,w:162,h:16,kind:'bridge'},
{x:700,y:185,w:156,h:16,kind:'shelf'}],
zones:[
{x:52,y:350,w:140,h:145,label:'AIRLOCK'},{x:245,y:64,w:160,h:170,label:'VECTOR BAY'},
{x:468,y:70,w:150,h:220,label:'REACTOR SPINE'},{x:690,y:64,w:195,h:145,label:'CORE CHAMBER'},
{x:690,y:250,w:195,h:235,label:'NULL LAB'}],
vectorLocks:[
{id:'alpha',x:330,y:390,r:32,dir:'up',door:{x:430,y:280,w:18,h:90,kind:'vector-door'}},
{id:'beta',x:545,y:155,r:32,dir:'right',door:{x:650,y:192,w:18,h:90,kind:'vector-door'}}],
security:{
lasers:[{x1:255,y1:250,x2:405,y2:250,phase:.5},{x1:475,y1:120,x2:620,y2:120,phase:2.1},{x1:705,y1:235,x2:860,y2:235,phase:3.7}],
guards:[{x:315,y:110,r:17,vx:34,vy:0,axis:'x',min:260,max:395,dir:1,seen:0,patrolSpeed:34},{x:805,y:430,r:17,vx:0,vy:-34,axis:'y',min:275,max:465,dir:-1,seen:0,patrolSpeed:34}]},
props:[{x:290,y:445,r:22,type:'reactor',mass:2.1,material:'metal'},{x:500,y:430,r:18,type:'orb',mass:.8,restitution:.5,material:'glass'},{x:745,y:375,r:25,type:'case',mass:1.8,material:'metal'}],
bonus:{x:760,y:110,r:11,type:'bonus'},spawn:{x:112,y:455},loot:{x:815,y:150},exit:{x:905,y:455,r:34}
};
