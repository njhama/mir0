export type BoardSnapshot<N, A> = { notes:N[]; arrows:A[] };
export type History<N,A> = { present:BoardSnapshot<N,A>; past:BoardSnapshot<N,A>[]; future:BoardSnapshot<N,A>[]; group:number | null };
export type HistoryAction<N,A> = {type:'reset';board:BoardSnapshot<N,A>} | {type:'undo'} | {type:'redo'} | {type:'notes';value:N[]|((value:N[])=>N[]);group:number} | {type:'arrows';value:A[]|((value:A[])=>A[]);group:number};
export function initialHistory<N,A>():History<N,A> { return {present:{notes:[],arrows:[]},past:[],future:[],group:null}; }
export function boardHistory<N,A>(state:History<N,A>, action:HistoryAction<N,A>):History<N,A> {
  if(action.type==='reset') return {...initialHistory<N,A>(),present:action.board};
  if(action.type==='undo') { if(!state.past.length) return state; return {present:state.past[state.past.length-1],past:state.past.slice(0,-1),future:[state.present,...state.future],group:null}; }
  if(action.type==='redo') { if(!state.future.length) return state; return {present:state.future[0],past:[...state.past,state.present],future:state.future.slice(1),group:null}; }
  let present:BoardSnapshot<N,A>;
  if(action.type==='notes') { const notes=typeof action.value==='function'?action.value(state.present.notes):action.value; if(notes.length===state.present.notes.length && notes.every((n,i)=>n===state.present.notes[i])) return state; present={...state.present,notes}; }
  else { const arrows=typeof action.value==='function'?action.value(state.present.arrows):action.value; if(arrows.length===state.present.arrows.length && arrows.every((a,i)=>a===state.present.arrows[i])) return state; present={...state.present,arrows}; }
  return {present,past:state.group===action.group?state.past:[...state.past,state.present].slice(-100),future:[],group:action.group};
}
