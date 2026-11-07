import{it,expect}from'vitest';
import{content}from'../src/content';
import{createInitialSave,applyCommand}from'../src/application/game';
import{emptyIndustry,industryCatalog,validIndustry}from'../src/domain/industry';
import legacy from'../src/content/industry-legacy-costs.json';
it('raises every processing duration and never requires multiple copies of a unique upgrade tool',()=>{
 for(const r of industryCatalog.recipes){const old=legacy[r.id as keyof typeof legacy];expect(r.seconds,r.id).toBeGreaterThan(old.seconds);for(const[id,n]of Object.entries(r.inputs)){expect(n,r.id).toBeGreaterThanOrEqual((old.inputs as Record<string,number>)[id]);if(industryCatalog.items.find(i=>i.id===id)?.kind==='tool')expect(n).toBe(1);}}
});
it('refunds legacy paid materials rather than the increased recipe and accepts legacy reserved power',()=>{
 const s=createInitialSave(content);s.industry=emptyIndustry(0);s.industry.stock={timber:2,stone:1};s.industry.job={recipeId:'bench',count:1,readyAt:12000};expect(validIndustry(s.industry)).toBe(true);
 const canceled=applyCommand(s,{type:'industryCancel'},content,{now:1000});expect(canceled.industry!.stock).toEqual({timber:6,stone:4});expect(s.industry.stock).toEqual({timber:2,stone:1});
 s.industry=emptyIndustry(0);s.industry.power={stored:140,generated:200,consumed:0};s.industry.job={recipeId:'resonant-circuit',count:1,readyAt:20000,energy:60};expect(validIndustry(s.industry)).toBe(true);
 const finished=applyCommand(s,{type:'industrySync'},content,{now:20000});expect(finished.industry!.stock['resonant-circuit']).toBe(2);expect(finished.industry!.power!.consumed).toBe(60);
 const refund=applyCommand(s,{type:'industryCancel'},content,{now:1000});expect(refund.industry!.power!.stored).toBe(200);expect(refund.industry!.stock).toEqual(legacy['resonant-circuit'].inputs);
 expect(validIndustry({...s.industry,job:{...s.industry.job,inputs:{ore:99999}}})).toBe(false);
});
