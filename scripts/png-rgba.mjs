import {inflateSync,deflateSync,crc32} from 'node:zlib';
import {imageInfo} from '../src/assets/format.js';
// Bounded, complete PNG decode at admission. The layered profile deliberately requires RGBA8, non-interlaced.
export function decodeRgba(bytes,{requireTransparency=true}={}){
 const info=imageInfo(bytes,'png'),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),chunks=[];let i=8,idat=false,ended=false;
 if(bytes[24]!==8||bytes[25]!==6||bytes[26]||bytes[27]||bytes[28])throw Error('PNG em camadas exige RGBA8 não entrelaçado');
 const crc=b=>{let c=0xffffffff;for(const n of b){c^=n;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
 while(i<bytes.length){if(i+12>bytes.length)throw Error('PNG truncado');const n=v.getUint32(i),type=new TextDecoder().decode(bytes.subarray(i+4,i+8));if(i+n+12>bytes.length||crc(bytes.subarray(i+4,i+8+n))!==v.getUint32(i+8+n))throw Error('PNG CRC/truncamento');if(type==='IDAT'){chunks.push(bytes.subarray(i+8,i+8+n));idat=true;}else if(type==='IEND'){if(n||i+n+12!==bytes.length)throw Error('PNG IEND inválido');ended=true;}else if(type==='acTL'||!['IHDR','sRGB','gAMA','cHRM','pHYs','tEXt','iTXt','zTXt','bKGD','sBIT'].includes(type)&&type[0]===type[0].toUpperCase())throw Error('PNG chunk não suportado');i+=n+12;}
 if(!idat||!ended)throw Error('PNG incompleto');
 const stride=info.width*4,raw=inflateSync(Buffer.concat(chunks),{maxOutputLength:(stride+1)*info.height}),rgba=new Uint8Array(stride*info.height);
 if(raw.length!==(stride+1)*info.height)throw Error('PNG scanlines inválidas');
 const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
 for(let y=0;y<info.height;y++){const f=raw[y*(stride+1)];if(f>4)throw Error('PNG filtro inválido');for(let x=0;x<stride;x++){const a=x>=4?rgba[y*stride+x-4]:0,b=y?rgba[(y-1)*stride+x]:0,c=y&&x>=4?rgba[(y-1)*stride+x-4]:0;rgba[y*stride+x]=(raw[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][f])&255;}}
 let transparent=0,visible=0,soft=0;for(let k=3;k<rgba.length;k+=4){if(rgba[k]===0)transparent++;else visible++;if(rgba[k]>0&&rgba[k]<255)soft++;}
 if(requireTransparency&&(!transparent||!visible))throw Error('PNG sem transparência real ou vazio');return {...info,rgba,transparent,visible,soft};
}
// PNG RGB8 sem filtro, rgb = w·h·3 bytes por linha (folhas de conferência do pixel).
export function encodeRgb(w,h,rgb){
 const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++)raw.set(rgb.subarray(y*w*3,(y+1)*w*3),y*(w*3+1)+1);
 const chunk=(type,data)=>{const len=Buffer.alloc(4),td=Buffer.concat([Buffer.from(type),data]),c=Buffer.alloc(4);len.writeUInt32BE(data.length);c.writeUInt32BE(crc32(td));return Buffer.concat([len,td,c]);};
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
