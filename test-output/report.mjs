import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from 'file:///C:/Program%20Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1105-1297-0_26.1105.1297.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs';
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load('D:/Download/HUSC-01_BlackBoxTestCase.xlsx'));
console.log((await wb.inspect({kind:'sheet',include:'id,name',maxChars:2000})).ndjson);
const sh=wb.worksheets.getItem('Bản đồ và khám phá địa điểm');
if(process.argv.includes('--preview')) {
 const p=await wb.render({sheetName:sh.name,range:'A8:H14',scale:1,format:'png'});
 await fs.writeFile('D:/DevProject/HueDiMo/test-output/before.png',new Uint8Array(await p.arrayBuffer()));
} else {
 const results=JSON.parse(await fs.readFile('D:/DevProject/HueDiMo/test-output/results.json','utf8'));
 for(const [row,result,note] of results){
  sh.getRange(`F${row}`).values=[[result]];
  if(result!=='Untested') {sh.getRange(`G${row}`).values=[[46334]]; sh.getRange(`G${row}`).setNumberFormat('dd/mm/yyyy');}
  sh.getRange(`H${row}`).values=[[sh.getRange(`H${row}`).values[0][0]+'\n08/11/2026: '+note]];
  sh.getRange(`A${row}:H${row}`).format.autofitRows();
 }
 wb.recalculate();
 console.log((await wb.inspect({kind:'table',sheetId:sh.name,range:'F5:H22',tableMaxRows:18,maxChars:3000})).ndjson);
 const p=await wb.render({sheetName:sh.name,range:'E38:H49',scale:1,format:'png'});
 await fs.writeFile('D:/DevProject/HueDiMo/test-output/after.png',new Uint8Array(await p.arrayBuffer()));
 await (await SpreadsheetFile.exportXlsx(wb)).save('D:/DevProject/HueDiMo/test-output/HUSC-01_BlackBoxTestCase_KetQua.xlsx');
}

