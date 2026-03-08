let provider;
let signer;
let contract;
let token;
let user;

const contractAddress="0xf4eE3240D8b817117b835D3a440890CA994dEBf6";
const tokenAddress="0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const abi=[

"function currentEpoch() view returns(uint256)",
"function downlineCount(address) view returns(uint256)",
"function epochStart() view returns(uint256)",
"function epochTotalWeight() view returns(uint256)",
"function pendingReward(address) view returns(uint256)",
"function getTRCPriceUSD() view returns(uint256)",
"function users(address) view returns(address,uint8,uint256,uint256,uint256)",

"function register(address)",
"function joinLevel1()",
"function joinLevel2()",
"function joinLevel3()",
"function joinLevel4()",
"function joinLevel5()",
"function joinLevel6()",
"function claimReward()"

];

const tokenABI=[
"function approve(address,uint256) returns(bool)"
];

function updateStatus(msg){
document.getElementById("status").innerHTML=msg;
}

function human(v){
return Number(ethers.utils.formatUnits(v,18)).toFixed(4);
}

function usd(v){
return Number(ethers.utils.formatUnits(v,18)).toFixed(4);
}

function formatTime(ts){
let d=new Date(ts*1000);
return d.toLocaleString();
}

async function connectWallet(){

await window.ethereum.request({method:'eth_requestAccounts'});

provider=new ethers.providers.Web3Provider(window.ethereum);
signer=provider.getSigner();

user=await signer.getAddress();

document.getElementById("wallet").innerText=user;

contract=new ethers.Contract(contractAddress,abi,signer);
token=new ethers.Contract(tokenAddress,tokenABI,signer);

loadData();
startTimers();

}

async function loadData(){

try{

const price=await contract.getTRCPriceUSD();
document.getElementById("price").innerText="$"+usd(price);

document.getElementById("epoch").innerText=
(await contract.currentEpoch()).toString();

document.getElementById("downline").innerText=
(await contract.downlineCount(user)).toString();

document.getElementById("pending").innerText=
human(await contract.pendingReward(user));

document.getElementById("epochWeight").innerText=
human(await contract.epochTotalWeight());

const userData=await contract.users(user);

document.getElementById("level").innerText=userData[1];
document.getElementById("baseWeight").innerText=human(userData[2]);
document.getElementById("tempWeight").innerText=human(userData[3]);

const start=(await contract.epochStart()).toNumber();

document.getElementById("epochStart").innerText=formatTime(start);

let next=start+604800;

document.getElementById("nextEpoch").innerText=formatTime(next);

}catch(e){
console.log(e);
}

}

function startTimers(){

setInterval(async()=>{

try{

const start=(await contract.epochStart()).toNumber();

let next=start+604800;

let now=Math.floor(Date.now()/1000);

let diff=next-now;

if(diff<0) diff=0;

let d=Math.floor(diff/86400);
let h=Math.floor((diff%86400)/3600);
let m=Math.floor((diff%3600)/60);
let s=diff%60;

let text=d+"d "+h+"h "+m+"m "+s+"s";

document.getElementById("epochTimer").innerText=text;
document.getElementById("claimTimer").innerText=text;

}catch(e){}

},1000)

}

async function handleTx(tx){

try{

updateStatus("⏳ Transaction sent...");

const sent=await tx;

updateStatus(`
Transaction submitted<br>
<a href="https://polygonscan.com/tx/${sent.hash}" target="_blank">
View on PolygonScan
</a>
`);

await sent.wait();

updateStatus(`
✅ Transaction Confirmed<br>
<a href="https://polygonscan.com/tx/${sent.hash}" target="_blank">
Open PolygonScan
</a>
`);

loadData();

}catch(e){

updateStatus("❌ Transaction failed");

}

}

async function register(){

const ref=document.getElementById("ref").value;

handleTx(contract.register(ref));

}

async function approveTRC(){

const amount=document.getElementById("approveAmount").value;

const value=ethers.utils.parseUnits(amount,18);

handleTx(token.approve(contractAddress,value));

}

async function joinLevel(l){

if(l==1) handleTx(contract.joinLevel1());
if(l==2) handleTx(contract.joinLevel2());
if(l==3) handleTx(contract.joinLevel3());
if(l==4) handleTx(contract.joinLevel4());
if(l==5) handleTx(contract.joinLevel5());
if(l==6) handleTx(contract.joinLevel6());

}

async function claimReward(){

handleTx(contract.claimReward());

}

setInterval(loadData,10000);
