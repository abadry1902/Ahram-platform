import type {ButtonHTMLAttributes,InputHTMLAttributes,SelectHTMLAttributes,TextareaHTMLAttributes,HTMLAttributes,TableHTMLAttributes,ReactNode,Ref} from "react";

const classes=(base:string,extra?:string)=>`${base}${extra?` ${extra}`:""}`;
export function Button({className,variant="primary",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{ref?:Ref<HTMLButtonElement>;variant?:"primary"|"secondary"|"outline"}){return <button className={classes(`button ${variant==="secondary"?"alt":variant==="outline"?"outline":""}`,className)} {...props}/>;}
export function Input({className,...props}:InputHTMLAttributes<HTMLInputElement>){return <input className={classes(props.type==="hidden"?"":"input",className)} {...props}/>;}
export function Select({className,...props}:SelectHTMLAttributes<HTMLSelectElement>){return <select className={classes("input",className)} {...props}/>;}
export function Textarea({className,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>){return <textarea className={classes("input",className)} {...props}/>;}
export function Card({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={classes("card",className)} {...props}/>;}
export function TableContainer({className,...props}:HTMLAttributes<HTMLDivElement>){return <div className={classes("table-wrap",className)} tabIndex={0} {...props}/>;}
export function DataTable({className,...props}:TableHTMLAttributes<HTMLTableElement>){return <table className={classes("data-table",className)} {...props}/>;}
export function EmptyState({title,description,icon}:{title:ReactNode;description?:ReactNode;icon?:ReactNode}){return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3>{description&&<p>{description}</p>}</div>;}
export function PageHeading({eyebrow,title,description,action}:{eyebrow?:string;title:ReactNode;description?:ReactNode;action?:ReactNode}){return <div className="title-row"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description&&<p className="muted">{description}</p>}</div>{action}</div>;}
