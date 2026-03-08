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
"function pendingReward(address) view returns(uint256)",
"function getTRCPriceUSD() view returns(uint256)",

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

let chart;
let prices=[];

function updateStatus(msg){
document.getElementById("status").innerHTML=msg;
}

async function connectWallet(){

await window.ethereum.request({method:'eth_requestAccounts'});

provider=new ethers.providers.Web3Provider(window.ethereum);
signer=provider.getSigner();

user=await signer.getAddress();

document.getElementById("wallet").innerText=user;

contract=new ethers.Contract(contractAddress,abi,signer);
token=new ethers.Contract(tokenAddress,tokenABI,signer);

startChart();

loadData();

}

async function loadData(){

const price=await contract.getTRCPriceUSD();
const priceUSD=(price/1e8).toFixed(2);

document.getElementById("price").innerText="$"+priceUSD;

prices.push(priceUSD);

if(prices.length>20) prices.shift();

chart.update();

const epoch=await contract.currentEpoch();

document.getElementById("epoch").innerText=epoch;

document.getElementById("downline").innerText=
await contract.downlineCount(user);

document.getElementById("pending").innerText=
await contract.pendingReward(user);

const start=await contract.epochStart();

let next=start+604800;

startTimer(next);

}

function startTimer(next){

setInterval(()=>{

let now=Math.floor(Date.now()/1000);

let diff=next-now;

let d=Math.floor(diff/86400);
let h=Math.floor((diff%86400)/3600);
let m=Math.floor((diff%3600)/60);
let s=diff%60;

let txt=d+"d "+h+"h "+m+"m "+s+"s";

document.getElementById("epochTimer").innerText=txt;
document.getElementById("claimTimer").innerText=txt;

},1000)

}

function startChart(){

const ctx=document.getElementById("priceChart");

chart=new Chart(ctx,{
type:'line',
data:{
labels:Array(20).fill(""),
datasets:[{
label:"TRC Price",
data:prices,
borderColor:"#FFD700",
backgroundColor:"rgba(255,215,0,0.2)"
}]
}
});

}

async function handleTx(tx){

updateStatus("Transaction Sent...");

const sent=await tx;

updateStatus(`
<a href="https://polygonscan.com/tx/${sent.hash}" target="_blank">
View Transaction
</a>
`);

await sent.wait();

updateStatus(`
Confirmed<br>
<a href="https://polygonscan.com/tx/${sent.hash}" target="_blank">
Open in PolygonScan
</a>
`);

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
