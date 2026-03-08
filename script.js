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
"function epochRewardSnapshot() view returns(uint256)",
"function epochStart() view returns(uint256)",
"function epochTotalWeight() view returns(uint256)",
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

function updateStatus(msg){
document.getElementById("status").innerHTML=msg;
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

}

async function loadData(){

const price=await contract.getTRCPriceUSD();
const priceUSD=(price/1e8).toFixed(2);

document.getElementById("price").innerText="$"+priceUSD;

document.getElementById("epoch").innerText=await contract.currentEpoch();

document.getElementById("downline").innerText=await contract.downlineCount(user);

document.getElementById("snapshot").innerText=(await contract.epochRewardSnapshot()).toString();

const start=await contract.epochStart();

document.getElementById("epochStart").innerText=formatTime(start);

let next=start+604800;

document.getElementById("nextEpoch").innerText=formatTime(next);

document.getElementById("nextClaim").innerText=formatTime(next);

document.getElementById("epochWeight").innerText=(await contract.epochTotalWeight()).toString();

document.getElementById("pending").innerText=(await contract.pendingReward(user)).toString();

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
