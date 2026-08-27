export const DIR = {
  xp:[1,0,0], xm:[-1,0,0], yp:[0,1,0], ym:[0,-1,0], zp:[0,0,1], zm:[0,0,-1]
};

export const DIR_LABEL = {xp:'RIGHT',xm:'LEFT',yp:'UP',ym:'DOWN',zp:'FRONT',zm:'BACK'};

const sizes = {
  x:[0.42,2.7,2.7], y:[2.7,0.42,2.7], z:[2.7,2.7,0.42]
};

const S=(id,pos,axis='x',opt={})=>({
  id,pos,axis,size:opt.size||sizes[axis],editable:opt.editable!==false,
  default:{receiver:'core',dir:'xp',...(opt.default||{})},
  solution:{receiver:'core',dir:'xp',...(opt.solution||opt.default||{})},
  kind:opt.kind||'panel', socket:opt.socket||null, label:opt.label||`IMPACT ${id}`,
  color:opt.color||null
});
const G=(id,pos,size=[.5,4,4],deps=[])=>({id,pos,size,deps});
const B=(id,pos,r=.7,gateIds=[])=>({id,pos,r,gateIds});
const K=(id,pos,r=.8,surfaceId,gateIds=[])=>({id,pos,r,surfaceId,gateIds});
const H=(pos,size)=>({pos,size});

export const CHAPTERS=[
  {id:1,name:'SIGNAL HALLS',subtitle:'Learn to rewrite a collision.',accent:'#56e8ff',secondary:'#8b7cff',environment:'atrium'},
  {id:2,name:'KINETIC WORKS',subtitle:'Make the world react instead.',accent:'#ffb45d',secondary:'#ff607f',environment:'foundry'},
  {id:3,name:'THE DEEP ARRAY',subtitle:'Route through machines in full 3D.',accent:'#b57cff',secondary:'#46ffd0',environment:'array'}
];

export const LEVELS=[
{
 id:1,chapter:1,name:'FIRST LAW',subtitle:'Turn the core once. See the rule become motion.',par:1,
 camera:{yaw:-0.68,pitch:0.3},
 launcher:{pos:[-6,0,0],dir:'xp',speed:5.0},goal:{pos:[0,4.8,0],r:.72},
 surfaces:[S('A',[0,0,0],'x',{default:{dir:'xp'},solution:{dir:'yp'},kind:'iris'})],
 environment:{preset:'atrium',hero:'suspended-ring',scale:1},hint:'Select A. Keep CORE selected, then send the impact UP.'
},
{
 id:2,chapter:1,name:'DOUBLE TURN',subtitle:'Two impacts. One clean route.',par:2,
 camera:{yaw:-0.7,pitch:0.31},
 launcher:{pos:[-6,-1.2,0],dir:'xp',speed:5.1},goal:{pos:[5,3.2,0],r:.72},
 surfaces:[
   S('A',[0,-1.2,0],'x',{default:{dir:'xp'},solution:{dir:'yp'},kind:'blade'}),
   S('B',[0,3.2,0],'y',{default:{dir:'yp'},solution:{dir:'xp'},kind:'iris'})
 ],environment:{preset:'atrium',hero:'bridge'},hint:'A sends the core UP. B sends it RIGHT.'
},
{
 id:3,chapter:1,name:'THE DROP',subtitle:'Direction is absolute. Down can be the answer.',par:2,
 camera:{yaw:-0.78,pitch:0.34},
 launcher:{pos:[-5,3.8,-1.4],dir:'xp',speed:5.0},goal:{pos:[4,-2.2,-1.4],r:.7},
 surfaces:[
  S('A',[0,3.8,-1.4],'x',{default:{dir:'xp'},solution:{dir:'ym'},kind:'paddle'}),
  S('B',[0,-2.2,-1.4],'y',{default:{dir:'ym'},solution:{dir:'xp'},kind:'blade'})
 ],environment:{preset:'atrium',hero:'shaft'},hint:'Use DOWN at A, then RIGHT at B.'
},
{
 id:4,chapter:1,name:'DEPTH SIGNAL',subtitle:'Leave the flat plane. Route through depth.',par:3,
 camera:{yaw:-0.92,pitch:0.4},
 launcher:{pos:[-6,0,-3.6],dir:'xp',speed:5.15},goal:{pos:[5,3.4,3.2],r:.72},
 surfaces:[
  S('A',[0,0,-3.6],'x',{default:{dir:'xp'},solution:{dir:'zp'},kind:'iris'}),
  S('B',[0,0,3.2],'z',{default:{dir:'zp'},solution:{dir:'yp'},kind:'blade'}),
  S('C',[0,3.4,3.2],'y',{default:{dir:'yp'},solution:{dir:'xp'},kind:'paddle'})
 ],environment:{preset:'atrium',hero:'depth-arches'},hint:'A FRONT → B UP → C RIGHT. Orbit the camera and read the room in depth.'
},
{
 id:5,chapter:2,name:'REACTION MASS',subtitle:'The core is not always the thing that moves.',par:1,
 camera:{yaw:-0.72,pitch:0.34},
 launcher:{pos:[-6,0,0],dir:'xp',speed:4.8},goal:{pos:[5,0,0],r:.72},
 surfaces:[
  S('A',[0,0,0],'x',{default:{receiver:'core',dir:'xp'},solution:{receiver:'surface',dir:'yp'},kind:'rail',socket:{id:'S1',pos:[0,3.6,0],r:.75,gateIds:['G1']}})
 ],gates:[G('G1',[3.0,0,0],[.45,4.4,4.4],['S1'])],sockets:[K('S1',[0,3.6,0],.82,'A',['G1'])],
 environment:{preset:'foundry',hero:'gantry'},hint:'Set A to SURFACE + UP. The panel docks overhead and unlocks the gate while the core continues.'
},
{
 id:6,chapter:2,name:'COUNTERWEIGHT',subtitle:'Move a machine part, then redirect the core.',par:2,
 camera:{yaw:-0.82,pitch:0.37},
 launcher:{pos:[-6,-1.5,-2.5],dir:'xp',speed:4.9},goal:{pos:[4.8,3.2,-2.5],r:.72},
 surfaces:[
  S('A',[-1,-1.5,-2.5],'x',{default:{receiver:'core',dir:'xp'},solution:{receiver:'surface',dir:'zp'},kind:'rail',socket:{id:'S1',pos:[-1,-1.5,2.8],r:.8,gateIds:['G1']}}),
  S('B',[2.2,-1.5,-2.5],'x',{default:{dir:'xp'},solution:{dir:'yp'},kind:'iris'}),
  S('C',[2.2,3.2,-2.5],'y',{editable:false,default:{dir:'xp'},kind:'fixed'})
 ],gates:[G('G1',[1.45,-1.5,-2.5],[.45,3.5,3.5],['S1'])],sockets:[K('S1',[-1,-1.5,2.8],.82,'A',['G1'])],
 environment:{preset:'foundry',hero:'counterweight'},hint:'A must move, not the core. Then B sends the core UP. C is already programmed.'
},
{
 id:7,chapter:2,name:'RELAY FLOOR',subtitle:'Touch a relay to wake the next machine.',par:2,
 camera:{yaw:-0.96,pitch:0.34},
 launcher:{pos:[-6,0,-3.4],dir:'xp',speed:5.0},goal:{pos:[4.8,0,3.3],r:.72},
 surfaces:[
  S('A',[0,0,-3.4],'x',{default:{dir:'xp'},solution:{dir:'zp'},kind:'paddle'}),
  S('B',[0,0,3.3],'z',{default:{dir:'zp'},solution:{dir:'xp'},kind:'iris'})
 ],beacons:[B('R1',[0,0,0],.75,['G1'])],gates:[G('G1',[2.2,0,3.3],[.45,3.8,3.8],['R1'])],
 environment:{preset:'foundry',hero:'relay-floor'},hint:'A sends FRONT through the relay. B turns RIGHT after the gate powers up.'
},
{
 id:8,chapter:2,name:'OVERHEAD',subtitle:'Build a route above the machinery, not around it.',par:3,
 camera:{yaw:-1.02,pitch:0.43},
 launcher:{pos:[-6,-1.8,-3.5],dir:'xp',speed:5.1},goal:{pos:[5,4.3,4.1],r:.75},
 surfaces:[
  S('A',[0,-1.8,-3.5],'x',{default:{dir:'xp'},solution:{dir:'yp'},kind:'blade'}),
  S('B',[0,4.3,-3.5],'y',{default:{dir:'yp'},solution:{dir:'zp'},kind:'iris'}),
  S('C',[0,4.3,1.2],'z',{default:{receiver:'core',dir:'zp'},solution:{receiver:'surface',dir:'ym'},kind:'rail',socket:{id:'S1',pos:[0,.2,1.2],r:.82,gateIds:['G1']}}),
  S('D',[0,4.3,4.1],'z',{editable:false,default:{dir:'xp'},kind:'fixed'})
 ],gates:[G('G1',[0,4.3,3.0],[3.6,3.6,.45],['S1'])],sockets:[K('S1',[0,.2,1.2],.82,'C',['G1'])],
 environment:{preset:'foundry',hero:'overhead-crane'},hint:'A UP → B FRONT. At C, move the SURFACE DOWN. The core continues FRONT through the opening; fixed D turns it RIGHT.'
},
{
 id:9,chapter:3,name:'CROSS AXIS',subtitle:'A three-dimensional route with no wasted edit.',par:4,
 camera:{yaw:-0.92,pitch:0.43},
 launcher:{pos:[-6,-2.0,-3.8],dir:'xp',speed:5.15},goal:{pos:[5,4.0,-.8],r:.75},
 surfaces:[
  S('A',[0,-2,-3.8],'x',{default:{dir:'xp'},solution:{dir:'zp'},kind:'iris'}),
  S('B',[0,-2,3.4],'z',{default:{dir:'zp'},solution:{dir:'yp'},kind:'blade'}),
  S('C',[0,4,3.4],'y',{default:{dir:'yp'},solution:{dir:'xm'},kind:'paddle'}),
  S('D',[-3.8,4,3.4],'x',{default:{dir:'xm'},solution:{dir:'zm'},kind:'iris'}),
  S('E',[-3.8,4,-.8],'z',{editable:false,default:{dir:'xp'},kind:'fixed'})
 ],environment:{preset:'array',hero:'cross-axis'},hint:'FRONT → UP → LEFT → BACK. E is fixed and sends you RIGHT to the exit.'
},
{
 id:10,chapter:3,name:'TWIN MACHINES',subtitle:'Two moving surfaces unlock two halves of the chamber.',par:4,
 camera:{yaw:-1.02,pitch:0.4},
 launcher:{pos:[-6,0,-3.2],dir:'xp',speed:4.9},goal:{pos:[5,3.6,6.0],r:.75},
 surfaces:[
  S('A',[-2,0,-3.2],'x',{default:{receiver:'core',dir:'xp'},solution:{receiver:'surface',dir:'yp'},kind:'rail',socket:{id:'S1',pos:[-2,1.45,-3.2],r:.8,gateIds:['G1']}}),
  S('B',[0,0,-3.2],'x',{default:{dir:'xp'},solution:{dir:'zp'},kind:'blade'}),
  S('C',[0,0,3.2],'z',{default:{receiver:'core',dir:'zp'},solution:{receiver:'surface',dir:'xm'},kind:'rail',socket:{id:'S2',pos:[-3.5,0,3.2],r:.8,gateIds:['G2']}}),
  S('D',[0,0,6.0],'z',{editable:false,default:{dir:'xp'},kind:'fixed'}),
  S('E',[2.1,0,6.0],'x',{default:{dir:'xp'},solution:{dir:'yp'},kind:'iris'}),
  S('F',[2.1,3.6,6.0],'y',{editable:false,default:{dir:'xp'},kind:'fixed'})
 ],gates:[
  G('G1',[-.45,0,-3.2],[.45,3.8,3.8],['S1']),G('G2',[0,0,5.25],[3.8,3.8,.45],['S2'])
 ],sockets:[K('S1',[-2,1.45,-3.2],.8,'A',['G1']),K('S2',[-3.5,0,3.2],.8,'C',['G2'])],
 environment:{preset:'array',hero:'twin-machines'},hint:'Move A UP to open gate one. B FRONT. Move C LEFT to open gate two. Fixed D turns RIGHT; E sends UP; fixed F finishes.'
},
{
 id:11,chapter:3,name:'NULL SPIRAL',subtitle:'Read the room. The shortest path threads between null fields.',par:5,
 camera:{yaw:-1.1,pitch:0.44},
 launcher:{pos:[-6,-2.1,-3.6],dir:'xp',speed:5.15},goal:{pos:[5,4.2,-.8],r:.74},
 surfaces:[
  S('A',[0,-2.1,-3.6],'x',{default:{dir:'xp'},solution:{dir:'yp'},kind:'blade'}),
  S('B',[0,1.2,-3.6],'y',{default:{dir:'yp'},solution:{dir:'zp'},kind:'iris'}),
  S('C',[0,1.2,3.4],'z',{default:{dir:'zp'},solution:{dir:'yp'},kind:'paddle'}),
  S('D',[0,4.2,3.4],'y',{default:{dir:'yp'},solution:{dir:'xm'},kind:'blade'}),
  S('E',[-3.5,4.2,3.4],'x',{default:{dir:'xm'},solution:{dir:'zm'},kind:'iris'}),
  S('F',[-3.5,4.2,-.8],'z',{editable:false,default:{dir:'xp'},kind:'fixed'})
 ],hazards:[H([-3.0,.0,.5],[2.4,3.0,2.4]),H([2.8,2.4,-.7],[2.4,2.5,2.8])],
 environment:{preset:'array',hero:'null-spiral'},hint:'UP → FRONT → UP → LEFT → BACK. The red null volumes punish flat shortcuts.'
},
{
 id:12,chapter:3,name:'THE IMPACT ENGINE',subtitle:'A complete machine. Core, surfaces, relays, depth and timing.',par:7,
 camera:{yaw:-0.94,pitch:0.45},
 launcher:{pos:[-6,-2.0,-3.7],dir:'xp',speed:5.0},goal:{pos:[5.4,4.4,6.3],r:.82},
 surfaces:[
  S('A',[-2.8,-2,-3.7],'x',{default:{receiver:'core',dir:'xp'},solution:{receiver:'surface',dir:'yp'},kind:'rail',socket:{id:'S1',pos:[-2.8,2.0,-3.7],r:.82,gateIds:['G1']}}),
  S('B',[0,-2,-3.7],'x',{default:{dir:'xp'},solution:{dir:'zp'},kind:'iris'}),
  S('C',[0,-2,0],'z',{default:{dir:'zp'},solution:{dir:'yp'},kind:'blade'}),
  S('D',[0,2.2,0],'y',{default:{dir:'yp'},solution:{dir:'zp'},kind:'paddle'}),
  S('E',[0,2.2,3.5],'z',{default:{receiver:'core',dir:'zp'},solution:{receiver:'surface',dir:'xm'},kind:'rail',socket:{id:'S2',pos:[-3.4,2.2,3.5],r:.82,gateIds:['G2']}}),
  S('H',[0,2.2,6.3],'z',{editable:false,default:{dir:'xp'},kind:'fixed'}),
  S('F',[2.0,2.2,6.3],'x',{default:{dir:'xp'},solution:{dir:'yp'},kind:'iris'}),
  S('G',[2.0,4.4,6.3],'y',{default:{dir:'yp'},solution:{dir:'xp'},kind:'blade'})
 ],beacons:[B('R1',[0,.0,0],.72,['G2'])],gates:[
   G('G1',[-.45,-2,-3.7],[.45,3.8,3.8],['S1']),
   G('G2',[0,2.2,5.6],[3.8,3.8,.45],['S2','R1'])
 ],sockets:[K('S1',[-2.8,2,-3.7],.82,'A',['G1']),K('S2',[-3.4,2.2,3.5],.82,'E',['G2'])],
 hazards:[H([3.2,-.2,-.4],[2.6,2.6,3.0]),H([-3.6,4.4,.8],[2.2,2.0,2.2])],
 environment:{preset:'array',hero:'impact-engine'},hint:'A SURFACE UP. B FRONT. C UP through the relay. D FRONT. E SURFACE LEFT. Fixed H turns RIGHT. F UP. G RIGHT.'
}
];

export function levelById(id){return LEVELS.find(l=>l.id===Number(id))||LEVELS[0]}
export function chapterById(id){return CHAPTERS.find(c=>c.id===Number(id))||CHAPTERS[0]}
