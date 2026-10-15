import { ButtonComponent, setIcon } from 'obsidian';

export class ActionButton extends ButtonComponent {
  constructor(parent,{icon,label,onClick}) {
    super(parent);this.icon=icon;this.buttonEl.addClass('primecore-settings-action');
    this.setButtonText(label);if(onClick)this.onClick(onClick);
  }
  setButtonText(label) {
    this.buttonEl.empty();
    const icon=this.buttonEl.createSpan({cls:'primecore-settings-action-icon',attr:{'aria-hidden':'true'}});
    setIcon(icon,this.icon);
    this.buttonEl.createSpan({text:label});
    this.buttonEl.setAttribute('aria-label',label);return this;
  }
}

export class ActionToolbar {
  constructor(parent,title='') {
    this.el=parent.createDiv({cls:'primecore-settings-toolbar',attr:{role:'toolbar','aria-label':title||'编辑操作'}});
    this.leadingEl=this.el.createDiv({cls:'primecore-settings-toolbar-leading'});
    this.titleEl=this.el.createSpan({cls:'primecore-settings-toolbar-title',text:title});
    this.actionsEl=this.el.createDiv({cls:'primecore-settings-toolbar-actions'});
  }
  add(icon,label,onClick) {return new ActionButton(this.actionsEl,{icon,label,onClick});}
  prepend(button) {this.actionsEl.prepend(button.buttonEl);}
}
