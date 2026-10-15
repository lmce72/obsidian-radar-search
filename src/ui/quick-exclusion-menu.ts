import {Component,Setting} from 'obsidian';
import {ActionButton} from '../settings/controls.ts';
import {exclusionTargets,hasExclusion,type ExclusionTarget} from '../search/quick-exclusions.ts';
import {positionFloatingElement} from './floating-geometry.ts';
import type {SearchPreset} from '../types.ts';
export type ExclusionDestination='temporary'|'preset';
interface QuickMenuOptions {
  anchor:HTMLElement;path:string;presets:()=>SearchPreset[];activePreset:string;
  rules:(destination:ExclusionDestination,preset:string)=>string[];
  toggle:(target:ExclusionTarget,destination:ExclusionDestination,preset:string)=>Promise<void>;
  create:(target:ExclusionTarget)=>void;edit:()=>void;onClose:()=>void;
}
export class QuickExclusionMenu extends Component {
  declare el:HTMLDivElement;
  private destination:ExclusionDestination='temporary';
  private preset:string;
  private targetsEl:HTMLDivElement;
  private presetEl:HTMLDivElement;
  private status:HTMLDivElement;
  private busy=false;
  private initialRect:DOMRect;
  private lastFocused:Element|null;
  constructor(private options:QuickMenuOptions) {super();this.preset=options.presets().some(p=>p.name===options.activePreset&&p.mode==='黑名单')?options.activePreset:'';}
  open() {this.load();}
  onload() {
    const doc=this.options.anchor.ownerDocument;
    this.lastFocused=doc.activeElement;this.initialRect=this.options.anchor.getBoundingClientRect();
    this.el=doc.body.createDiv({cls:'primecore-quick-exclusions',attr:{role:'dialog','aria-label':'多级排除'}});
    const top=this.el.createDiv({cls:'primecore-quick-filter-destination',attr:{role:'radiogroup','aria-label':'排除规则保存位置'}});
    const name='primecore-exclusion-destination-'+crypto.randomUUID();
    for(const [value,label] of [['temporary','临时过滤'],['preset','写入预设']] as const) {
      const option=top.createEl('label');
      const radio=option.createEl('input',{type:'radio',attr:{name,value}});radio.checked=value===this.destination;
      option.createSpan({text:label});
      this.registerDomEvent(radio,'change',()=>{this.destination=value;this.renderPreset();this.renderTargets();this.reposition();});
    }
    new ActionButton(top,{icon:'x',label:'关闭',onClick:()=>this.close()});
    const content=this.el.createDiv({cls:'primecore-quick-exclusion-content'});
    this.presetEl=content.createDiv();
    content.createDiv({cls:'setting-item-description',text:this.options.path||'请先打开笔记，或从搜索结果右侧选择过滤。'});
    this.targetsEl=content.createDiv();
    this.status=content.createDiv({cls:'setting-item-description',attr:{role:'status'}});
    new ActionButton(content,{icon:'sliders-horizontal',label:'编辑过滤规则',onClick:()=>{this.close();this.options.edit();}});
    this.registerDomEvent(this.el,'click',event=>event.stopPropagation());
    this.registerDomEvent(doc,'pointerdown',event=>{if(!this.el.contains(event.target as Node)&&!this.options.anchor.contains(event.target as Node))this.close();});
    this.registerDomEvent(doc,'keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.close();}});
    this.registerDomEvent(doc,'scroll',()=>this.reposition(),{capture:true,passive:true});
    this.registerDomEvent(doc.defaultView,'resize',()=>this.reposition());
    const viewport=doc.defaultView.visualViewport;
    if(viewport) {
      const reposition=()=>this.reposition();
      viewport.addEventListener('resize',reposition);viewport.addEventListener('scroll',reposition);
      this.register(()=>{viewport.removeEventListener('resize',reposition);viewport.removeEventListener('scroll',reposition);});
    }
    this.renderPreset();this.renderTargets();this.reposition();
    this.el.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});
  }
  private renderPreset() {
    this.presetEl.empty();if(this.destination!=='preset')return;
    new Setting(this.presetEl).setName('写入预设').setDesc('选择黑名单预设；新建时进入名称填写视图。').addDropdown(control=>{
      control.addOption('','新建预设…');
      this.options.presets().filter(p=>p.mode==='黑名单').forEach(p=>control.addOption(p.name,p.name));
      control.setValue(this.preset).onChange(value=>{this.preset=value;this.renderTargets();});
    });
  }
  private renderTargets() {
    this.targetsEl.empty();
    const rules=this.options.rules(this.destination,this.preset);
    for(const target of exclusionTargets(this.options.path)) {
      const active=hasExclusion(rules,target.rule);
      const label=target.kind==='file'?(active?'恢复这篇笔记':'排除这篇笔记'):`${active?'恢复目录':'排除目录'}：${target.path}（第 ${target.level} 级）`;
      const button=new ActionButton(this.targetsEl,{icon:active?'rotate-ccw':target.kind==='file'?'eye-off':'folder-minus',label,onClick:async event=>{
        event.stopPropagation();if(this.busy)return;
        if(this.destination==='preset'&&this.preset===''){this.close();this.options.create(target);return;}
        this.busy=true;this.renderTargets();
        try {await this.options.toggle(target,this.destination,this.preset);if(this.el.isConnected)this.status.setText(this.destination==='temporary'?'已更新临时排除条件':'已更新预设并用于当前搜索');}
        catch(error){if(this.el.isConnected)this.status.setText(error.message);}
        finally{this.busy=false;if(this.el.isConnected){this.renderTargets();this.reposition();}}
      }});
      button.buttonEl.addClass('primecore-menu-choice');button.buttonEl.setAttribute('aria-pressed',String(active));button.setDisabled(this.busy);
    }
  }
  reposition() {
    if(!this.el)return;
    const anchor=this.options.anchor.isConnected?this.options.anchor.getBoundingClientRect():this.initialRect;
    const natural=(this.el.firstElementChild?.scrollHeight||0)+(this.el.lastElementChild?.scrollHeight||0)+2;
    positionFloatingElement(this.el,anchor,Math.max(320,Math.min(620,anchor.width)),natural,480);
  }
  close() {this.unload();}
  onunload() {this.el?.remove();this.options.onClose();if(this.lastFocused instanceof HTMLElement&&this.lastFocused.isConnected)this.lastFocused.focus({preventScroll:true});}
}
