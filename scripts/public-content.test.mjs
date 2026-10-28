import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {selectRecommended} from '../lib/article-selection.mjs';
const source=readFileSync(new URL('../lib/content.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {articles}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('every fallback article gets three unique recommendations excluding itself',()=>{
 assert.equal(articles.length,5);
 for(const a of articles){const related=selectRecommended(articles,a.slug,a.category);assert.equal(related.length,3);assert.equal(new Set(related.map(x=>x.slug)).size,3);assert.ok(related.every(x=>x.slug!==a.slug));for(const locale of ['ar','en'])assert.ok(related.every(x=>x[`${locale}Title`]&&x[`${locale}Excerpt`]));}
});
test('same-category recommendations rank first regardless of chronological order',()=>{
 const a=articles.find(x=>x.slug==='company-formation-egypt');const result=selectRecommended([...articles].reverse(),a.slug,a.category);assert.equal(result[0].slug,'commercial-contract-basics');
});
test('deduplication preserves authoritative first result and deterministic ordering',()=>{
 const items=[{slug:'self',category:'a'},{slug:'other',category:'b',title:'new'},{slug:'other',category:'a',title:'stale'},{slug:'same',category:'a'},{slug:'last',category:'b'}];
 const actual=selectRecommended(items,'self','a');assert.deepEqual(actual.map(x=>x.slug),['same','other','last']);assert.equal(actual[1].title,'new');
});
test('a small live publication pool does not invent articles',()=>{assert.deepEqual(selectRecommended([{slug:'self',category:'a'}],'self','a'),[]);});
const {mergePublishedWithGuides}=await import('../lib/article-selection.mjs');
test('sparse CMS gets at least three recommendations via explicit guide URLs',()=>{
 const live=[{...articles[0],arTitle:'Published CMS title'}];const pool=mergePublishedWithGuides(live,articles);
 assert.equal(pool.length,5);assert.equal(pool[0].arTitle,'Published CMS title');assert.ok(pool.slice(1).every(a=>a.slug.startsWith('guides/')));
 for(const a of pool)assert.equal(selectRecommended(pool,a.slug,a.category).length,3);
 const offline=mergePublishedWithGuides([],articles);assert.ok(offline.every(a=>a.slug.startsWith('guides/')));assert.ok(!offline.some(a=>a.slug==='company-formation-egypt'));
});
test('recommendations exclude the same content across CMS and guide URLs',()=>{
 const pool=mergePublishedWithGuides([articles[0]],articles);const related=selectRecommended(pool,'guides/company-formation-egypt','corporate');assert.equal(related.length,3);assert.ok(related.every(a=>!a.slug.endsWith('company-formation-egypt')));
});
