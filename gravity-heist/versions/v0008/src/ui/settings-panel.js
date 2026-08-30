import{settings,DEFAULT_SETTINGS}from'../persistence/settings.js';
const pct=v=>`${Math.round(v*100)}%`;
export class SettingsPanel{constructor({onApply=()=>{},hapticsSupported=false}={}){this.el=document.querySelector('#settingsPanel');this.onApply=onApply;this.hapticsSupported=hapticsSupported;this.controls={master:document.querySelector('#setMaster'),fx:document.querySelector('#setFx'),security:document.querySelector('#setSecurity'),ui:document.querySelector('#setUi'),haptics:document.querySelector('#setHaptics'),reducedMotion:document.querySelector('#setReducedMotion'),quality:document.querySelector('#setQuality')};this.values={master:document.querySelector('#valMaster'),fx:document.querySelector('#valFx'),security:document.querySelector('#valSecurity'),ui:document.querySelector('#valUi')};this.controls.haptics.disabled=!hapticsSupported;document.querySelector('#hapticSupport').textContent=hapticsSupported?'SUPPORTED':'UNAVAILABLE IN THIS BROWSER';for(const [k,c]of Object.entries(this.controls))c.addEventListener('input',()=>this.commit(k));document.querySelector('#resetSettings').onclick=()=>{this.render(settings.reset());this.apply()};this.render(settings.load())}
read(){return{master:+this.controls.master.value,fx:+this.controls.fx.value,security:+this.controls.security.value,ui:+this.controls.ui.value,haptics:this.hapticsSupported&&this.controls.haptics.checked,reducedMotion:this.controls.reducedMotion.checked,quality:this.controls.quality.value}}
render(v){for(const k of['master','fx','security','ui']){this.controls[k].value=v[k];this.values[k].textContent=pct(v[k])}this.controls.haptics.checked=this.hapticsSupported&&v.haptics;this.controls.reducedMotion.checked=v.reducedMotion;this.controls.quality.value=v.quality}
commit(k){const v=settings.write(this.read());this.render(v);this.onApply(v,{changed:k})}
apply(){const v=settings.load();this.onApply(v,{changed:'all'});return v}
show(){this.render(settings.load());this.el.classList.remove('hidden')}
hide(){this.el.classList.add('hidden')}
}
export{DEFAULT_SETTINGS};
