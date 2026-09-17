import {useReducer,useRef,useCallback} from 'react';
import {boardHistory,initialHistory,type HistoryAction} from './board-history';
export function useBoardHistory<N,A>() {
  const [state,dispatch]=useReducer(boardHistory<N,A>,initialHistory<N,A>());
  const group=useRef(0);
  const reset=useCallback((board:{notes:N[];arrows:A[]})=>dispatch({type:'reset',board}),[]);
  return {state, begin:()=>{group.current++;},
    setNotes:(value:Extract<HistoryAction<N,A>,{type:'notes'}>['value'])=>dispatch({type:'notes',value,group:group.current}),
    setArrows:(value:Extract<HistoryAction<N,A>,{type:'arrows'}>['value'])=>dispatch({type:'arrows',value,group:group.current}),
    reset,
    undo:()=>{group.current++;dispatch({type:'undo'});},redo:()=>{group.current++;dispatch({type:'redo'});}};
}
