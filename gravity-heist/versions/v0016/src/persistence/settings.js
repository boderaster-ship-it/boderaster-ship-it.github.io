const KEY='gravity-heist-settings-v1';
export const DEFAULT_SETTINGS=Object.freeze({master:.9,fx:1,security:.85,ui:1,haptics:true,reducedMotion:false,quality:'auto'});
const clamp=v=>Math.max(0,Math.min(1,Number.isFinite(+v)?+v:1));
export function normalizeSettings(v={}){const q=['auto','performance','quality'].includes(v.quality)?v.quality:'auto';return{master:clamp(v.master??DEFAULT_SETTINGS.master),fx:clamp(v.fx??DEFAULT_SETTINGS.fx),security:clamp(v.security??DEFAULT_SETTINGS.security),ui:clamp(v.ui??DEFAULT_SETTINGS.ui),haptics:v.haptics!==false,reducedMotion:v.reducedMotion===true,quality:q}}
export const settings={load(){try{return normalizeSettings(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return normalizeSettings()}},write(next){const v=normalizeSettings(next);try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}return v},reset(){try{localStorage.removeItem(KEY)}catch{}return normalizeSettings()}};
