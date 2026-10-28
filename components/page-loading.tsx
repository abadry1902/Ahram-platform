'use client';
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {PyramidLoader} from './pyramid-loader';
// Mounted only by the route's Suspense fallback; removed when the route resolves.
export function PageLoading(){
 const [mounted,setMounted]=useState(false);
 useEffect(()=>{setMounted(true);},[]);
 const content=<div className="page-loading-overlay" aria-busy="true"><div className="page-loading-panel"><PyramidLoader label="جارٍ تحميل الصفحة… · Loading page…"/></div></div>;
 return mounted?createPortal(content,document.body):content;
}
