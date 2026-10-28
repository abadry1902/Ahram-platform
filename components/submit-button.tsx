'use client';
import {useFormStatus} from 'react-dom';
import {PyramidLoader} from './pyramid-loader';
import type {ButtonHTMLAttributes} from 'react';
export function SubmitButton({children,disabled,...props}:ButtonHTMLAttributes<HTMLButtonElement>){const {pending}=useFormStatus();return <button {...props} disabled={disabled||pending} aria-busy={pending}>{pending?<PyramidLoader small label="جارٍ الحفظ · Saving"/>:children}</button>;}
