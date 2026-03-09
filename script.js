let provider;
let signer;
let contract;
let token;
let user;
let chart;

const contractAddress = "0xf4eE3240D8b817117b835D3a440890CA994dEBf6";
const tokenAddress = "0xc08983be707bf4b763e7A0f3cCAD3fd00af6620d";

const abi = [
  "function currentEpoch() view returns(uint256)",
  "function downlineCount(address) view returns(uint256)",
  "function epochStart() view returns(uint256)",
  "function epochTotalWeight() view returns(uint256)",
  "function pendingReward(address) view returns(uint256)",
  "function getTRCPriceUSD() view returns(uint256)",
  "function totalWeight() view returns(uint256)",
  "function rewardPool() view returns(uint256)",
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

const tokenABI = [
  "function approve(address,uint256) returns(bool)"
];

function updateStatus(msg){
  document.getElementById("status").innerHTML = msg;
}

function human(v){
  return Number(ethers.utils.formatUnits(v,18)).toFixed(4);
}

function usd(v){
  return Number(ethers.utils.formatUnits(v,18)).toFixed(4);
}

function formatTime(ts){
  let d = new Date(ts*1000);
  return d.toLocaleString();
}

function initChart(){
  const ctx = document.getElementById("priceChart").getContext("2d");
  chart = new Chart(ctx,{
    type:"line",
    data:{
      labels:["Start"],
      datasets:[{
        label:"TRC Price USD",
        data:[0],
        fill:true,
        tension:0.4
      }]
    },
    options:{
      responsive:true,
      plugins:{
        legend:{display:true}
      }
    }
  });
}

async function connectWallet(){
  await window.ethereum.request({method:'eth_requestAccounts'});
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  user = await signer.getAddress();
  document.getElementById("wallet").innerText = user;
  contract = new ethers.Contract(contractAddress,abi,signer);
  token = new ethers.Contract(tokenAddress,tokenABI,signer);

  loadData();
  startTimers();
  startClaimCountdown(); // Start the independent Next Claim timer
}

async function loadData(){
  try{
    const price = await contract.getTRCPriceUSD();
    const usdPrice = usd(price);
    document.getElementById("price").innerText = "$"+usdPrice;

    if(chart){
      chart.data.labels.push(new Date().toLocaleTimeString());
      chart.data.datasets[0].data.push(usdPrice);

      if(chart.data.labels.length>20){
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
      }
      chart.update();
    }

    document.getElementById("epoch").innerText =
      (await contract.currentEpoch()).toString();

    document.getElementById("downline").innerText =
      (await contract.downlineCount(user)).toString();

    document.getElementById("pending").innerText =
      human(await contract.pendingReward(user));

    /* REWARD POOL */
    const rewardPool = await contract.rewardPool();
    document.getElementById("rewardPool").innerText =
      human(rewardPool);
    
    document.getElementById("epochWeight").innerText =
      (await contract.epochTotalWeight()).toString();

    const userData = await contract.users(user);
    document.getElementById("level").innerText = userData[1];
    document.getElementById("baseWeight").innerText = userData[2].toString();
    document.getElementById("tempWeight").innerText = userData[3].toString();

    /* TOTAL WEIGHT */
    try{
      const totalWeight = await contract.totalWeight();
      document.getElementById("totalWeight").innerText =
        ethers.utils.formatUnits(totalWeight,0);
    }catch(e){
      console.log("Total weight error",e);
    }

    /* EPOCH TIME */
    const start = Math.floor(new Date("2026-03-07T21:00:00+05:30").getTime()/1000);
    document.getElementById("epochStart").innerText = formatTime(start);

    const epochLength = 7 * 24 * 60 * 60;
    let now = Math.floor(Date.now()/1000);
    let epochNumber = Math.floor((now - start) / epochLength);
    let nextEpoch = start + ((epochNumber + 1) * epochLength);
    document.getElementById("nextEpoch").innerText = formatTime(nextEpoch);

  }catch(e){
    console.log(e);
  }
}

function startTimers(){
  setInterval(()=>{
    try{
      const start = Math.floor(new Date("2026-03-07T21:00:00+05:30").getTime()/1000);
      const epochLength = 7 * 24 * 60 * 60;
      const claimLength = 14 * 24 * 60 * 60;

      let now = Math.floor(Date.now()/1000);

      /* NEXT EPOCH */
      let epochNumber = Math.floor((now - start) / epochLength);
      if(epochNumber < 0) epochNumber = 0;
      let nextEpoch = start + ((epochNumber + 1) * epochLength);

      /* EPOCH COUNTDOWN */
      let remaining = nextEpoch - now;
      if(remaining < 0) remaining = 0;
      let d = Math.floor(remaining / 86400);
      remaining = remaining % 86400;
      let h = Math.floor(remaining / 3600);
      remaining = remaining % 3600;
      let m = Math.floor(remaining / 60);
      document.getElementById("epochTimer").innerText =
        d + " days " + h + " hr " + m + " min";

      /* CURRENT CLAIM COUNTDOWN inside epoch is not used anymore - handled separately */

    }catch(e){
      console.log(e);
    }
  },1000);
}

function startClaimCountdown() {

  const claimLength = 7 * 24 * 60 * 60;

  const referenceFriday = Math.floor(
    new Date("2026-03-07T21:00:00+05:30").getTime() / 1000
  );

  setInterval(() => {

    const now = Math.floor(Date.now() / 1000);

    const elapsed = now - referenceFriday;

    let claimRemaining = claimLength - (elapsed % claimLength);

    const cd = Math.floor(claimRemaining / 86400);
    claimRemaining %= 86400;

    const ch = Math.floor(claimRemaining / 3600);
    claimRemaining %= 3600;

    const cm = Math.floor(claimRemaining / 60);
    const cs = claimRemaining % 60;

    document.getElementById("claimTimer").innerText =
      cd + " days " + ch + " hr " + cm + " min " + cs + " sec";

  },1000);
}
async function handleTx(tx){
  try{
    updateStatus("⏳ Transaction sent...");
    const sent = await tx;
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
    updateStatus("❌ Transaction failed or rejected");
  }
}

async function register(){
  const ref = document.getElementById("ref").value;
  handleTx(contract.register(ref));
}

async function approveTRC(){
  const amount = document.getElementById("approveAmount").value;
  const value = ethers.utils.parseUnits(amount,18);
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
window.onload = initChart;
