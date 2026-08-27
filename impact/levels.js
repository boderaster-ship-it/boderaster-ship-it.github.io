export const WORLDS = [
  {id:1, title:'FIRST CONTACT', subtitle:'Learn to redirect impact.', accent:0x64e9ff, fog:0x07131c, sky:0x0b2330, floor:0x102a35},
  {id:2, title:'VECTOR GARDENS', subtitle:'Think in three dimensions.', accent:0x8bffb5, fog:0x07180f, sky:0x102a1c, floor:0x173522},
  {id:3, title:'MOMENTUM FOUNDRY', subtitle:'Move the world, not the orb.', accent:0xffb45c, fog:0x1b0d08, sky:0x352016, floor:0x3a2417},
  {id:4, title:'NULL CATHEDRAL', subtitle:'One rule can change everything.', accent:0xc69cff, fog:0x100a1c, sky:0x21143b, floor:0x281b40},
  {id:5, title:'THE IMPACT CORE', subtitle:'Master WHO + WHERE.', accent:0xff668d, fog:0x18070d, sky:0x350e1c, floor:0x3b1420}
];

const box=(id,pos,size,solution,extra={})=>({id,pos,size,editable:true,rule:{receiver:'orb',dir:'xp'},solution,...extra});
const fixed=(id,pos,size,rule={receiver:'orb',dir:'xm'},extra={})=>({id,pos,size,editable:false,rule,solution:rule,...extra});
const goal=(pos,r=.7)=>({pos,r});
const hazard=(pos,size)=>({pos,size});
const sw=(id,pos,size,gateId)=>({id,pos,size,gateId});
const gate=(id,pos,size)=>({id,pos,size});
const L=(id,world,name,subtitle,launcher,goalData,surfaces,extra={})=>({
  id,world,name,subtitle,launcher:{pos:launcher,dir:[1,0,0],speed:5.4},goal:goalData,surfaces,
  hazards:[],switches:[],gates:[],par:surfaces.filter(s=>s.editable).length,hint:'Inspect the route. Program only the impacts you need.',...extra
});

export const LEVELS = [
  L(1,1,'THE TURN','One impact. One new direction.',[-6,1.2,0],goal([0,4.8,0]),[
    box('A',[0,1.2,0],[.45,3,3],{receiver:'orb',dir:'yp'})
  ],{par:1,hint:'The orb reaches A from the left. Send the ORB upward.'}),
  L(2,1,'THE RETURN','Direction can be reversed.',[-6,1.2,0],goal([-5.4,4.4,0]),[
    box('A',[0,1.2,0],[.45,3,3],{receiver:'orb',dir:'yp'}),
    box('B',[0,4.4,0],[3,.45,3],{receiver:'orb',dir:'xm'})
  ],{par:2,hint:'Up at A. Left at B.'}),
  L(3,1,'RIGHT ANGLES','Two impacts build a route.',[-6,1.2,0],goal([4.8,4.2,0]),[
    box('A',[-.8,1.2,0],[.45,3,3],{receiver:'orb',dir:'yp'}),
    box('B',[-.8,4.2,0],[3,.45,3],{receiver:'orb',dir:'xp'})
  ],{par:2}),
  L(4,1,'DOWNSTREAM','Down is useful too.',[-6,4.6,0],goal([4.8,1.2,0]),[
    box('A',[-1,4.6,0],[.45,3,3],{receiver:'orb',dir:'ym'}),
    box('B',[-1,1.2,0],[3,.45,3],{receiver:'orb',dir:'xp'})
  ],{launcher:{pos:[-6,4.6,0],dir:[1,0,0],speed:5.4},par:2}),
  L(5,1,'THE FRAME','Use three programmed impacts.',[-6,1.2,0],goal([1.5,4.15,0]),[
    box('A',[-1.5,1.2,0],[.45,3,3],{receiver:'orb',dir:'yp'}),
    box('B',[-1.5,4.6,0],[3,.45,3],{receiver:'orb',dir:'xp'}),
    box('C',[4.2,4.6,0],[.45,3,3],{receiver:'orb',dir:'xm'})
  ],{par:3}),
  L(6,1,'FALSE FRIEND','Not every surface needs editing.',[-6,1.2,0],goal([4.8,4.4,0]),[
    box('A',[-1,1.2,0],[.45,3,3],{receiver:'orb',dir:'yp'}),
    fixed('B',[-1,4.4,0],[3,.45,3],{receiver:'orb',dir:'xp'}),
    box('C',[3,2.7,0],[.45,1.4,2],{receiver:'orb',dir:'xp'})
  ],{par:1,hint:'The glowing editable surface is the only one that matters. Fixed surfaces already have a rule.'}),
  L(7,1,'RED ZONE','Redirect before the hazard.',[-6,1.2,0],goal([3.8,4.4,0]),[
    box('A',[-1.3,1.2,0],[.45,3,3],{receiver:'orb',dir:'yp'}),
    fixed('B',[-1.3,4.4,0],[3,.45,3],{receiver:'orb',dir:'xp'})
  ],{hazards:[hazard([1.5,1.2,0],[2.2,1.2,2.2])],par:1}),
  L(8,1,'THREE BEATS','Read the sequence before launching.',[-6,1.1,0],goal([5,1.1,0]),[
    box('A',[-2,1.1,0],[.4,2.8,2.8],{receiver:'orb',dir:'yp'}),
    box('B',[-2,4.6,0],[2.8,.4,2.8],{receiver:'orb',dir:'xp'}),
    box('C',[3.8,4.6,0],[.4,2.8,2.8],{receiver:'orb',dir:'ym'}),
    fixed('D',[3.8,1.1,0],[2.8,.4,2.8],{receiver:'orb',dir:'xp'})
  ],{par:3}),
  L(9,1,'ONE EDIT','A finished machine with one wrong rule.',[-6,1.2,0],goal([5,4.4,0]),[
    fixed('A',[-1.5,1.2,0],[.45,3,3],{receiver:'orb',dir:'yp'}),
    box('B',[-1.5,4.4,0],[3,.45,3],{receiver:'orb',dir:'xp'}),
    fixed('C',[5.4,4.4,0],[.45,3,3],{receiver:'orb',dir:'xm'})
  ],{par:1}),
  L(10,1,'FIRST CIRCUIT','The complete 2D vocabulary.',[-6,1.1,0],goal([-5.2,5.1,0]),[
    box('A',[-2.4,1.1,0],[.4,3,3],{receiver:'orb',dir:'yp'}),
    box('B',[-2.4,5.0,0],[3,.4,3],{receiver:'orb',dir:'xp'}),
    box('C',[2.6,5.0,0],[.4,3,3],{receiver:'orb',dir:'ym'}),
    box('D',[2.6,1.1,0],[3,.4,3],{receiver:'orb',dir:'xm'}),
    fixed('E',[-5.0,1.1,0],[.4,3,3],{receiver:'orb',dir:'yp'})
  ],{par:4}),

  L(11,2,'DEPTH','There is a third direction now.',[-6,1.3,0],goal([0,1.3,4.8]),[
    box('A',[0,1.3,0],[.45,3,3],{receiver:'orb',dir:'zp'})
  ],{par:1,hint:'Send the ORB FORWARD (+Z). Rotate the camera if needed.'}),
  L(12,2,'BACKTRACK','Front and back are equal tools.',[-6,1.3,2.8],goal([4.8,1.3,-2.8]),[
    box('A',[-1,1.3,2.8],[.45,3,2],{receiver:'orb',dir:'zm'}),
    box('B',[-1,1.3,-2.8],[2,3,.45],{receiver:'orb',dir:'xp'})
  ],{par:2}),
  L(13,2,'STAIR IN SPACE','Climb without stairs.',[-6,1.1,-2.8],goal([4.8,4.5,2.8]),[
    box('A',[-2,1.1,-2.8],[.4,2.4,2],{receiver:'orb',dir:'yp'}),
    box('B',[-2,4.5,-2.8],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-2,4.5,2.8],[2,2,.4],{receiver:'orb',dir:'xp'})
  ],{par:3}),
  L(14,2,'THE CUBE','Route around three faces.',[-6,1.2,-3],goal([4.8,1.2,3]),[
    box('A',[-2.4,1.2,-3],[.4,3,2],{receiver:'orb',dir:'yp'}),
    box('B',[-2.4,4.8,-3],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-2.4,4.8,3],[2,2,.4],{receiver:'orb',dir:'ym'}),
    box('D',[-2.4,1.2,3],[2,.4,2],{receiver:'orb',dir:'xp'})
  ],{par:4}),
  L(15,2,'CAMERA LIES','A straight line can hide in depth.',[-6,2.0,0],goal([5,2,3.8]),[
    box('A',[-1.5,2,0],[.4,3,3],{receiver:'orb',dir:'zp'}),
    fixed('B',[-1.5,2,3.8],[3,3,.4],{receiver:'orb',dir:'xp'})
  ],{par:1}),
  L(16,2,'CROSSWIND','Avoid the red volume in 3D.',[-6,1.3,0],goal([5,1.3,3.8]),[
    box('A',[-1.4,1.3,0],[.4,3,3],{receiver:'orb',dir:'zp'}),
    box('B',[-1.4,1.3,3.8],[3,3,.4],{receiver:'orb',dir:'xp'})
  ],{hazards:[hazard([1.8,1.3,0],[2.6,2.2,2.2])],par:2}),
  L(17,2,'HIGH ROAD','Use height and depth together.',[-6,1.0,-3.4],goal([5,4.7,3.4]),[
    box('A',[-2.6,1,-3.4],[.4,2.5,2],{receiver:'orb',dir:'yp'}),
    box('B',[-2.6,4.7,-3.4],[2,.4,2],{receiver:'orb',dir:'zp'}),
    fixed('C',[-2.6,4.7,3.4],[2,2,.4],{receiver:'orb',dir:'xp'})
  ],{par:2}),
  L(18,2,'SIX DIRECTIONS','Every axis matters.',[-6,1.0,0],goal([-5.2,5,-3.2]),[
    box('A',[-3,1,0],[.4,2.5,2.5],{receiver:'orb',dir:'zp'}),
    box('B',[-3,1,3],[2.5,2.5,.4],{receiver:'orb',dir:'yp'}),
    box('C',[-3,5,3],[2.5,.4,2.5],{receiver:'orb',dir:'zm'}),
    box('D',[-3,5,-3.2],[2.5,2.5,.4],{receiver:'orb',dir:'xm'})
  ],{par:4}),
  L(19,2,'MINIMUM','Five surfaces. Two edits.',[-6,1.2,-2],goal([5.5,1.65,1.52]),[
    fixed('A',[-2,1.2,-2],[.4,2.5,2],{receiver:'orb',dir:'yp'}),
    box('B',[-2,4.5,-2],[2,.4,2],{receiver:'orb',dir:'zp'}),
    fixed('C',[-2,4.5,2],[2,2,.4],{receiver:'orb',dir:'xp'}),
    box('D',[4.5,4.5,2],[.4,2,2],{receiver:'orb',dir:'ym'}),
    fixed('E',[4.5,1.2,2],[2,.4,2],{receiver:'orb',dir:'xp'})
  ],{par:2}),
  L(20,2,'VECTOR GARDEN','A full 3D circuit.',[-6,1.0,-3],goal([-5,5,3]),[
    box('A',[-3,1,-3],[.4,2.4,2],{receiver:'orb',dir:'yp'}),
    box('B',[-3,5,-3],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-3,5,3],[2,2,.4],{receiver:'orb',dir:'xp'}),
    box('D',[3.8,5,3],[.4,2,2],{receiver:'orb',dir:'ym'}),
    box('E',[3.8,1.1,3],[2,.4,2],{receiver:'orb',dir:'xm'}),
    box('F',[-5,1.1,3],[.4,2,2],{receiver:'orb',dir:'yp'})
  ],{par:6}),

  L(21,3,'MOVE THE WALL','The orb keeps going. The surface reacts.',[-6,1.2,0],goal([6.2,1.2,0]),[
    box('A',[-.8,1.2,0],[.7,2,2],{receiver:'surface',dir:'yp'},{dynamic:true})
  ],{switches:[sw('S',[ -.8,4.2,0],[1.5,.6,1.5],'G')],gates:[gate('G',[4.2,1.2,0],[.5,3,3])],par:1,hint:'Choose SURFACE + UP. Move A onto the switch before the orb reaches the gate.'}),
  L(22,3,'SIDE SWITCH','Move a blocker sideways.',[-6,1.2,0],goal([6.2,1.2,0]),[
    box('A',[-1.2,1.2,0],[.7,2,2],{receiver:'surface',dir:'zp'},{dynamic:true})
  ],{switches:[sw('S',[-1.2,1.2,3.2],[1.5,1.5,.6],'G')],gates:[gate('G',[4.6,1.2,0],[.5,3,3])],par:1}),
  L(23,3,'TWO JOBS','First move the world, then redirect the orb.',[-6,1.2,0],goal([0.7,5.5,0]),[
    box('A',[-2.0,1.2,0],[.7,2,2],{receiver:'surface',dir:'zm'},{dynamic:true}),
    box('B',[1.2,1.2,0],[.45,3,3],{receiver:'orb',dir:'yp'})
  ],{switches:[sw('S',[-2,1.2,-3.2],[1.5,1.5,.6],'G')],gates:[gate('G',[.1,1.2,0],[.35,3,3])],par:2}),
  L(24,3,'LIFT THE GATE','A moving surface can clear a path directly.',[-6,1.2,0],goal([6.2,1.2,0]),[
    box('A',[0,1.2,0],[.8,3,3],{receiver:'surface',dir:'yp'},{dynamic:true})
  ],{par:1,hint:'The obstacle itself is the problem. Send the SURFACE upward.'}),
  L(25,3,'DROP IT','Sometimes the world must fall away.',[-6,4.5,0],goal([6,4.5,0]),[
    box('A',[0,4.5,0],[.8,2.4,2.4],{receiver:'surface',dir:'ym'},{dynamic:true})
  ],{launcher:{pos:[-6,4.5,0],dir:[1,0,0],speed:5.4},par:1}),
  L(26,3,'CHAIN SWITCH','One moving surface unlocks a later impact.',[-6,1.2,0],goal([0.5,5.5,0]),[
    box('A',[-2.5,1.2,0],[.7,2,2],{receiver:'surface',dir:'yp'},{dynamic:true}),
    box('B',[1.0,1.2,0],[.45,3,3],{receiver:'orb',dir:'yp'})
  ],{switches:[sw('S',[-2.5,4.3,0],[1.4,.6,1.4],'G')],gates:[gate('G',[-.2,1.2,0],[.4,3,3])],par:2}),
  L(27,3,'DEPTH MACHINE','Surface motion can happen off the flight path.',[-6,1.2,0],goal([5.5,1.2,3.5]),[
    box('A',[-2.4,1.2,0],[.7,2,2],{receiver:'surface',dir:'zp'},{dynamic:true}),
    box('B',[1.5,1.2,0],[.45,3,3],{receiver:'orb',dir:'zp'}),
    fixed('C',[1.5,1.2,3.5],[3,3,.45],{receiver:'orb',dir:'xp'})
  ],{switches:[sw('S',[-2.4,1.2,3.1],[1.4,1.4,.6],'G')],gates:[gate('G',[.0,1.2,0],[.4,3,3])],par:2}),
  L(28,3,'DOUBLE LOCK','Two surfaces, two switches.',[-6,1.2,0],goal([6.4,1.2,0]),[
    box('A',[-3.2,1.2,0],[.65,1.8,1.8],{receiver:'surface',dir:'yp'},{dynamic:true}),
    box('B',[-.2,1.2,0],[.65,1.8,1.8],{receiver:'surface',dir:'zm'},{dynamic:true})
  ],{switches:[sw('S1',[-3.2,4.2,0],[1.3,.6,1.3],'G1'),sw('S2',[-.2,1.2,-3.0],[1.3,1.3,.6],'G2')],gates:[gate('G1',[2.4,1.2,0],[.4,3,3]),gate('G2',[4.4,1.2,0],[.4,3,3])],par:2}),
  L(29,3,'WHO MATTERS','Two identical impacts need different receivers.',[-6,1.2,0],goal([0.7,5.5,0]),[
    box('A',[-2.5,1.2,0],[.65,2,2],{receiver:'surface',dir:'yp'},{dynamic:true}),
    box('B',[1.2,1.2,0],[.45,3,3],{receiver:'orb',dir:'yp'})
  ],{switches:[sw('S',[-2.5,4.1,0],[1.3,.6,1.3],'G')],gates:[gate('G',[-.2,1.2,0],[.4,3,3])],par:2}),
  L(30,3,'FOUNDRY','A complete WHO + WHERE machine.',[-6,1.2,-2.5],goal([5.5,4.6,2.5]),[
    box('A',[-3,1.2,-2.5],[.65,2,2],{receiver:'surface',dir:'zp'},{dynamic:true}),
    box('B',[-.5,1.2,-2.5],[.4,2.8,2.2],{receiver:'orb',dir:'yp'}),
    box('C',[-.5,4.6,-2.5],[2.2,.4,2.2],{receiver:'orb',dir:'zp'}),
    fixed('D',[-.5,4.6,2.5],[2.2,2.2,.4],{receiver:'orb',dir:'xp'})
  ],{switches:[sw('S',[-3,1.2,-1.25],[1.3,1.3,.6],'G')],gates:[gate('G',[-1.7,1.2,-2.5],[.4,3,2.4])],par:3}),

  L(31,4,'SINGLE RULE','Six impacts. Change one.',[-6,1.1,-2.8],goal([5.5,4.8,2.8]),[
    fixed('A',[-3,1.1,-2.8],[.4,2,2],{receiver:'orb',dir:'yp'}),
    fixed('B',[-3,4.8,-2.8],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-3,4.8,2.8],[2,2,.4],{receiver:'orb',dir:'xp'}),
    fixed('D',[2,4.8,2.8],[.4,2,2],{receiver:'orb',dir:'xp'})
  ],{par:1}),
  L(32,4,'THE DECOY','The obvious surface is not the useful one.',[-6,1.2,0],goal([-0.45,5.5,0]),[
    box('A',[-2.8,1.2,0],[.4,2.4,2.4],{receiver:'orb',dir:'xp'}),
    box('B',[0,1.2,0],[.4,3,3],{receiver:'orb',dir:'yp'})
  ],{hazards:[hazard([2.8,1.2,0],[2.5,2.4,2.4])],par:1,hint:'A can stay straight. B must send the orb up.'}),
  L(33,4,'NULL FLOOR','There is no safe straight route.',[-6,1.2,-2.8],goal([5.4,1.2,2.8]),[
    box('A',[-2.4,1.2,-2.8],[.4,2.4,2],{receiver:'orb',dir:'yp'}),
    fixed('B',[-2.4,4.8,-2.8],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-2.4,4.8,2.8],[2,2,.4],{receiver:'orb',dir:'ym'}),
    fixed('D',[-2.4,1.2,2.8],[2,.4,2],{receiver:'orb',dir:'xp'})
  ],{hazards:[hazard([0,1.2,0],[5,2,4])],par:2}),
  L(34,4,'SACRIFICE','Move a surface into danger to open the path.',[-6,1.2,0],goal([6.2,1.2,0]),[
    box('A',[-2.2,1.2,0],[.65,2,2],{receiver:'surface',dir:'ym'},{dynamic:true})
  ],{switches:[sw('S',[-2.2,-1.3,0],[1.4,.6,1.4],'G')],gates:[gate('G',[4,1.2,0],[.4,3,3])],par:1}),
  L(35,4,'CROSSED WIRES','Surface and orb must leave in different axes.',[-6,1.2,-2.5],goal([5.4,4.7,2.5]),[
    box('A',[-3,1.2,-2.5],[.65,2,2],{receiver:'surface',dir:'zp'},{dynamic:true}),
    box('B',[-.6,1.2,-2.5],[.4,2.6,2.2],{receiver:'orb',dir:'yp'}),
    fixed('C',[-.6,4.7,-2.5],[2,.4,2],{receiver:'orb',dir:'zp'}),
    fixed('D',[-.6,4.7,2.5],[2,2,.4],{receiver:'orb',dir:'xp'})
  ],{switches:[sw('S',[-3,1.2,-1.25],[1.3,1.3,.6],'G')],gates:[gate('G',[-1.8,1.2,-2.5],[.4,3,2.2])],par:2}),
  L(36,4,'LOCKED VECTOR','One editable surface, one fixed bad-looking path.',[-6,4.7,0],goal([5.6,1.2,0]),[
    box('A',[-1.2,4.7,0],[.4,2.5,2.5],{receiver:'orb',dir:'ym'}),
    fixed('B',[-1.2,1.2,0],[2.5,.4,2.5],{receiver:'orb',dir:'xp'})
  ],{launcher:{pos:[-6,4.7,0],dir:[1,0,0],speed:5.4},hazards:[hazard([2.2,4.7,0],[2.2,2,2])],par:1}),
  L(37,4,'CATHEDRAL I','A tall three-dimensional loop.',[-6,1.0,-3],goal([-5.2,5.3,3]),[
    box('A',[-3.5,1,-3],[.4,2.2,2],{receiver:'orb',dir:'yp'}),
    fixed('B',[-3.5,5.3,-3],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-3.5,5.3,3],[2,2,.4],{receiver:'orb',dir:'xm'})
  ],{par:2}),
  L(38,4,'CATHEDRAL II','Open the center, then route around it.',[-6,1.2,0],goal([5.6,4.8,3]),[
    box('A',[-3.2,1.2,0],[.65,2,2],{receiver:'surface',dir:'yp'},{dynamic:true}),
    box('B',[-.8,1.2,0],[.4,2.5,2.5],{receiver:'orb',dir:'yp'}),
    fixed('C',[-.8,4.8,0],[2,.4,2],{receiver:'orb',dir:'zp'}),
    fixed('D',[-.8,4.8,3],[2,2,.4],{receiver:'orb',dir:'xp'})
  ],{switches:[sw('S',[-3.2,2.75,0],[1.3,.6,1.3],'G')],gates:[gate('G',[-2,1.2,0],[.4,3,2.5])],par:2}),
  L(39,4,'NO WASTE','Solve with exactly three edits.',[-6,1.1,-3],goal([5.4,4.8,3]),[
    box('A',[-3.4,1.1,-3],[.4,2.2,2],{receiver:'orb',dir:'yp'}),
    box('B',[-3.4,4.8,-3],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-3.4,4.8,3],[2,2,.4],{receiver:'orb',dir:'xp'}),
    box('D',[1.5,4.8,3],[.4,2,2],{receiver:'orb',dir:'xp'})
  ],{par:3}),
  L(40,4,'NULL CATHEDRAL','A puzzle made from fixed truth and three choices.',[-6,1,-3],goal([5.5,1,3]),[
    fixed('A',[-3.5,1,-3],[.4,2,2],{receiver:'orb',dir:'yp'}),
    box('B',[-3.5,5,-3],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-3.5,5,3],[2,2,.4],{receiver:'orb',dir:'ym'}),
    box('D',[-3.5,1,3],[2,.4,2],{receiver:'orb',dir:'xp'})
  ],{hazards:[hazard([0,1,-.4],[4,1.6,3.2])],par:3}),

  L(41,5,'CORE ENTRY','One surface unlocks, another redirects.',[-6,1.2,-2.5],goal([5.5,4.7,2.5]),[
    box('A',[-3.2,1.2,-2.5],[.65,2,2],{receiver:'surface',dir:'zp'},{dynamic:true}),
    box('B',[-.6,1.2,-2.5],[.4,2.5,2.2],{receiver:'orb',dir:'yp'}),
    fixed('C',[-.6,4.7,-2.5],[2,.4,2],{receiver:'orb',dir:'zp'}),
    fixed('D',[-.6,4.7,2.5],[2,2,.4],{receiver:'orb',dir:'xp'})
  ],{switches:[sw('S',[-3.2,1.2,-1.25],[1.3,1.3,.6],'G')],gates:[gate('G',[-1.9,1.2,-2.5],[.4,3,2.2])],par:2}),
  L(42,5,'CORE LOOP','A full loop with a moving key.',[-6,1,-3],goal([-5.2,5.1,3]),[
    box('A',[-3.6,1,-3],[.65,1.8,1.8],{receiver:'surface',dir:'yp'},{dynamic:true}),
    box('B',[-1.5,1,-3],[.4,2,2],{receiver:'orb',dir:'yp'}),
    fixed('C',[-1.5,5.1,-3],[2,.4,2],{receiver:'orb',dir:'zp'}),
    fixed('D',[-1.5,5.1,3],[2,2,.4],{receiver:'orb',dir:'xm'})
  ],{switches:[sw('S',[-3.6,2.55,-3],[1.2,.6,1.2],'G')],gates:[gate('G',[-2.5,1,-3],[.35,2.5,2])],par:2}),
  L(43,5,'HIDDEN DEPTH','The camera angle is part of reading the puzzle.',[-6,2.2,0],goal([5.6,2.2,-3.5]),[
    box('A',[-2,2.2,0],[.4,2.6,2.6],{receiver:'orb',dir:'zm'}),
    fixed('B',[-2,2.2,-3.5],[2.6,2.6,.4],{receiver:'orb',dir:'xp'})
  ],{hazards:[hazard([1.5,2.2,0],[2.6,2.4,2.4])],par:1}),
  L(44,5,'TWO KEYS','Move two different surfaces in two different axes.',[-6,1.2,0],goal([6.2,1.2,0]),[
    box('A',[-3.6,1.2,0],[.65,1.8,1.8],{receiver:'surface',dir:'yp'},{dynamic:true}),
    box('B',[-.6,1.2,0],[.65,1.8,1.8],{receiver:'surface',dir:'zp'},{dynamic:true})
  ],{switches:[sw('S1',[-3.6,4.0,0],[1.2,.6,1.2],'G1'),sw('S2',[-.6,1.2,3.0],[1.2,1.2,.6],'G2')],gates:[gate('G1',[2.4,1.2,0],[.4,3,3]),gate('G2',[4.4,1.2,0],[.4,3,3])],par:2}),
  L(45,5,'THE KNIFE','A narrow safe path through hazards.',[-6,1.1,-3],goal([5.5,4.8,3]),[
    box('A',[-3.5,1.1,-3],[.4,2,2],{receiver:'orb',dir:'yp'}),
    box('B',[-3.5,4.8,-3],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-3.5,4.8,3],[2,2,.4],{receiver:'orb',dir:'xp'})
  ],{hazards:[hazard([0,1.1,0],[5,1.5,5]),hazard([0,4.8,0],[3,1,2])],par:3}),
  L(46,5,'SWITCHBACK','Alternate receiver types.',[-6,1.2,-2.5],goal([5.5,4.6,2.5]),[
    box('A',[-3.4,1.2,-2.5],[.65,1.8,1.8],{receiver:'surface',dir:'zp'},{dynamic:true}),
    box('B',[-.8,1.2,-2.5],[.4,2.4,2],{receiver:'orb',dir:'yp'}),
    box('C',[-.8,4.6,-2.5],[2,.4,2],{receiver:'orb',dir:'zp'}),
    fixed('D',[-.8,4.6,2.5],[2,2,.4],{receiver:'orb',dir:'xp'})
  ],{switches:[sw('S',[-3.4,1.2,-1.25],[1.3,1.3,.6],'G')],gates:[gate('G',[-2,1.2,-2.5],[.4,3,2.2])],par:3}),
  L(47,5,'PARADOX','The surface that moves is also the surface you need later.',[-6,1.2,0],goal([-0.05,5.5,0]),[
    box('A',[-2.8,1.2,0],[.65,2,2],{receiver:'surface',dir:'yp'},{dynamic:true}),
    box('B',[.4,1.2,0],[.4,2.6,2.6],{receiver:'orb',dir:'yp'})
  ],{switches:[sw('S',[-2.8,4.0,0],[1.3,.6,1.3],'G')],gates:[gate('G',[-1.4,1.2,0],[.4,3,2.6])],par:2}),
  L(48,5,'THE LONG WAY','The shortest-looking route is lethal.',[-6,1,-3],goal([5.4,1,3]),[
    box('A',[-3.6,1,-3],[.4,2,2],{receiver:'orb',dir:'yp'}),
    fixed('B',[-3.6,5,-3],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-3.6,5,3],[2,2,.4],{receiver:'orb',dir:'ym'}),
    fixed('D',[-3.6,1,3],[2,.4,2],{receiver:'orb',dir:'xp'})
  ],{hazards:[hazard([0,1,0],[5,2,3.8])],par:2}),
  L(49,5,'MASTER RULE','Five surfaces. Three edits. No waste.',[-6,1,-3],goal([5.4,5,3]),[
    fixed('A',[-3.5,1,-3],[.4,2,2],{receiver:'orb',dir:'yp'}),
    box('B',[-3.5,5,-3],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('C',[-3.5,5,3],[2,2,.4],{receiver:'orb',dir:'xp'}),
    box('D',[2.3,5,3],[.4,2,2],{receiver:'orb',dir:'xp'}),
    fixed('E',[4.7,5,3],[.4,2,2],{receiver:'orb',dir:'xp'})
  ],{par:3}),
  L(50,5,'IMPACT','The final machine uses everything.',[-6,1,-3],goal([5.8,5,3]),[
    box('A',[-4.2,1,-3],[.65,1.8,1.8],{receiver:'surface',dir:'yp'},{dynamic:true}),
    box('B',[-2.0,1,-3],[.4,2,2],{receiver:'orb',dir:'yp'}),
    box('C',[-2.0,5,-3],[2,.4,2],{receiver:'orb',dir:'zp'}),
    box('D',[-2.0,5,3],[2,2,.4],{receiver:'orb',dir:'xp'}),
    box('E',[3.0,5,3],[.4,2,2],{receiver:'orb',dir:'xp'})
  ],{switches:[sw('S',[-4.2,2.55,-3],[1.2,.6,1.2],'G')],gates:[gate('G',[-3.0,1,-3],[.35,2.6,2.2])],hazards:[hazard([0,1,0],[4.5,1.6,3.8])],par:4,hint:'Move A UP to unlock the route. Then route the orb UP, FORWARD and RIGHT.'})
];

export const getWorldLevels = worldId => LEVELS.filter(l => l.world === worldId);
