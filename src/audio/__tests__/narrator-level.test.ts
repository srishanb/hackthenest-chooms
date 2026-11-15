/** Balance prerecorded speech without clipping or amplifying silence. */
import { expect, it } from 'vitest';
import { narrationGain } from '../narrator/level';
const buffer=(samples:number[])=>({numberOfChannels:1,length:samples.length,getChannelData:()=>Float32Array.from(samples)});
it('balances quiet/loud speech and limits amplification',()=>{
  expect(narrationGain(buffer([.1,-.1]))).toBeCloseTo(1);
  expect(narrationGain(buffer([.2,-.2]))).toBeCloseTo(.5);
  expect(narrationGain(buffer([.001,-.001]))).toBe(2);
});
it('keeps peak headroom and handles silence/invalid audio safely',()=>{
  const samples=Array(10000).fill(0);samples[0]=1;
  expect(narrationGain(buffer(samples))).toBeCloseTo(.85);
  expect(narrationGain(buffer([0,0]))).toBe(1);
  expect(narrationGain(buffer([NaN]))).toBe(1);
  expect(narrationGain(buffer([]))).toBe(1);
});
