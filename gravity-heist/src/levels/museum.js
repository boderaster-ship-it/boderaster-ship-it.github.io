export const MUSEUM={
id:'museum',name:'AURORA MUSEUM',lootName:'THE AURORA',tagline:'STEAL THE AURORA. ESCAPE CLEAN.',baseScore:10000,
solids:[
{x:250,y:42,w:18,h:150,kind:'wall'},{x:250,y:310,w:18,h:208,kind:'wall'},
{x:470,y:210,w:18,h:130,kind:'spine'},
{x:600,y:42,w:18,h:120,kind:'wall'},{x:600,y:250,w:18,h:268,kind:'wall'},
{x:268,y:270,w:182,h:16,kind:'bridge'},{x:618,y:250,w:192,h:16,kind:'bridge'},
{x:760,y:330,w:102,h:16,kind:'shelf'}],
zones:[
{x:52,y:350,w:180,h:145,label:'ENTRY GALLERY'},
{x:278,y:64,w:170,h:175,label:'ARCHIVE SHAFT'},
{x:500,y:64,w:82,h:255,label:'LIFT CORE'},
{x:638,y:64,w:238,h:160,label:'AURORA VAULT'},
{x:640,y:285,w:246,h:206,label:'SECURITY ATRIUM'}],
props:[{x:420,y:442,r:26,type:'sculpture',mass:2.2,material:'stone'},{x:520,y:315,r:20,type:'orb',restitution:.52,mass:.9,material:'glass'},{x:795,y:390,r:23,type:'case',mass:1.7,material:'metal'},{x:335,y:145,r:16,type:'orb',restitution:.4,mass:.75,material:'glass'}],
bonus:{x:530,y:120,r:11,type:'bonus'},spawn:{x:132,y:455},loot:{x:690,y:158},exit:{x:905,y:105,r:34}
};
