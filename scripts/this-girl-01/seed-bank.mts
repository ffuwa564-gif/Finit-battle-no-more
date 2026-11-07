import{createHash}from'node:crypto';
/** Logical preregistered row IDs are not adjacent LCG inputs. Freeze before confirmation. */
export function confirmationSeed(logical:number):number{
 if(!Number.isInteger(logical)||!((logical>=930001&&logical<=930256)||(logical>=950001&&logical<=950256)||(logical>=960001&&logical<=960256)))throw Error('Not a reserved confirmation seed identifier');
 return createHash('sha256').update('STILLVEIL:this-girl-01:uniform32:v1:'+logical).digest().readUInt32LE(0);
}
