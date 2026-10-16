/** Native buttons synthesize one click for mouse, touch and keyboard activation. */
export function bindButtonActivation(button:HTMLButtonElement,activate:(event:MouseEvent)=>void):()=>void {
  // Prevent Live Preview's editor handlers from treating the press as a code-block edit.
  // Do not cancel the default: touch scrolling, focus and native click synthesis must work.
  const stopPress=(event:Event)=>event.stopPropagation();
  const click=(event:MouseEvent)=>{event.stopPropagation();activate(event);};
  button.addEventListener('pointerdown',stopPress);
  button.addEventListener('mousedown',stopPress);
  button.addEventListener('touchstart',stopPress,{passive:true});
  button.addEventListener('click',click);
  return ()=>{
    button.removeEventListener('pointerdown',stopPress);
    button.removeEventListener('mousedown',stopPress);
    button.removeEventListener('touchstart',stopPress);
    button.removeEventListener('click',click);
  };
}
