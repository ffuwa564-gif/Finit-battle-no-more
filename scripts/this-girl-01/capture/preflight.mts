// Development seed only. Produces no final footage or confirmation evidence.
import {prepare} from './prepare-proof.mts';
import {gem} from '../after-policy.mts';
await prepare({id:'preflight-sakuya',stageId:'kuzuha-awakening',applicationSeed:910021,preflight:true,model:'after',config:{party:['astraea','athena','seris-awakened','mireille'],leader:'athena',gems:[gem('echo-shard',6,'mercy',6,'swift'),gem('pale-ward',6,'bulwark',6),gem('echo-shard',6,'bulwark',6),gem('twin-tide',6,'none',0)],policy:5,command:false,potionThreshold:.6}});
