<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>TRC Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>

<!-- Wallet -->
<button id="connectWalletBtn" onclick="connectWallet()">Connect Wallet</button>
<span id="wallet"></span>

<!-- Status -->
<div id="status"></div>

<!-- Dashboard -->
<div>
    <p>TRC Price: <span id="price">0</span></p>
    <canvas id="priceChart" width="400" height="200"></canvas>
    <p>Epoch: <span id="epoch"></span></p>
    <p>Next Epoch: <span id="nextEpoch"></span></p>
    <p>Epoch Countdown: <span id="epochTimer"></span></p>
    <p>Next Claim Countdown: <span id="claimTimer"></span></p>
    <p>Downline: <span id="downline"></span></p>
    <p>Pending Reward: <span id="pending"></span></p>
    <p>Epoch Weight: <span id="epochWeight"></span></p>
    <p>Level: <span id="level"></span></p>
    <p>Base Weight: <span id="baseWeight"></span></p>
    <p>Temp Weight: <span id="tempWeight"></span></p>
    <p>Total Weight: <span id="totalWeight"></span></p>
</div>

<script>
let provider, signer, contract, token, user, chart;

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

const tokenABI = ["function approve(address,uint256) returns(bool)"];

function updateStatus(msg){ document.getElementById("status").innerHTML = msg; }
function human(v){ return Number(ethers.utils.formatUnits(v,18)).toFixed(4); }
function usd(v){ return Number(ethers.utils.formatUnits(v,18)).toFixed(4); }
function formatTime(ts){ return new Date(ts*1000).toLocaleString(); }

function initChart(){
    const ctx = document.getElementById("priceChart").getContext("2d");
    chart = new Chart(ctx,{
        type:"line",
        data:{ labels:["Start"], datasets:[{label:"TRC Price USD", data:[0], fill:true, tension:0.4}]},
        options:{ responsive:true, plugins:{legend:{display:true}} }
    });
}

async function connectWallet(){
    if(!window.ethereum){ alert("MetaMask not detected!"); return; }
    try{
        await window.ethereum.request({method:'eth_requestAccounts'});
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        user = await signer.getAddress();
        document.getElementById("wallet").innerText = user;

        contract = new ethers.Contract(contractAddress,abi,signer);
        token = new ethers.Contract(tokenAddress,tokenABI,signer);

        loadData();
        startTimers();
    }catch(e){ console.log("Wallet connection failed:", e); }
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

        document.getElementById("epoch").innerText = (await contract.currentEpoch()).toString();
        document.getElementById("downline").innerText = (await contract.downlineCount(user)).toString();
        document.getElementById("pending").innerText = human(await contract.pendingReward(user));
        document.getElementById("epochWeight").innerText = (await contract.epochTotalWeight()).toString();

        const userData = await contract.users(user);
        document.getElementById("level").innerText = userData[1];
        document.getElementById("baseWeight").innerText = userData[2].toString();
        document.getElementById("tempWeight").innerText = userData[3].toString();

        try{
            const totalWeight = await contract.totalWeight();
            document.getElementById("totalWeight").innerText = ethers.utils.formatUnits(totalWeight,0);
        }catch(e){ console.log("Total weight error",e); }

    }catch(e){ console.log(e); }
}

// Unified timer for Epoch & Next Claim
function startTimers(){
    const start = Math.floor(new Date("2026-03-07T21:00:00+05:30").getTime()/1000);
    const epochLength = 7*24*60*60;
    const nextClaimLength = (6*86400)+(1*3600)+(50*60); // 6d 1h 50m

    setInterval(()=>{
        const now = Math.floor(Date.now()/1000);

        // Epoch countdown
        let epochNumber = Math.floor((now-start)/epochLength);
        if(epochNumber<0) epochNumber=0;
        let nextEpoch = start + ((epochNumber+1)*epochLength);
        let remaining = nextEpoch-now;
        remaining = remaining>0 ? remaining : 0;
        let d = Math.floor(remaining/86400);
        remaining %= 86400;
        let h = Math.floor(remaining/3600);
        remaining %= 3600;
        let m = Math.floor(remaining/60);
        let s = remaining%60;
        document.getElementById("epochTimer").innerText = d+" days "+h+" hr "+m+" min "+s+" sec";

        // Next Claim countdown
        let claimRemaining = nextClaimLength - ((now-start)%nextClaimLength);
        claimRemaining = claimRemaining>0 ? claimRemaining : 0;
        let cd = Math.floor(claimRemaining/86400);
        claimRemaining %= 86400;
        let ch = Math.floor(claimRemaining/3600);
        claimRemaining %= 3600;
        let cm = Math.floor(claimRemaining/60);
        let cs = claimRemaining%60;
        document.getElementById("claimTimer").innerText = cd+" days "+ch+" hr "+cm+" min "+cs+" sec";

    },1000);
}

// Transaction helpers
async function handleTx(tx){
    try{
        updateStatus("⏳ Transaction sent...");
        const sent = await tx;
        updateStatus(`<a href="https://polygonscan.com/tx/${sent.hash}" target="_blank">View on PolygonScan</a>`);
        await sent.wait();
        updateStatus(`✅ Transaction Confirmed <a href="https://polygonscan.com/tx/${sent.hash}" target="_blank">Open PolygonScan</a>`);
        loadData();
    }catch(e){ updateStatus("❌ Transaction failed or rejected"); console.log(e); }
}

// User actions
async function register(){ handleTx(contract.register(document.getElementById("ref").value)); }
async function approveTRC(){ handleTx(token.approve(contractAddress, ethers.utils.parseUnits(document.getElementById("approveAmount").value,18))); }
async function joinLevel(l){ handleTx(contract["joinLevel"+l]()); }
async function claimReward(){ handleTx(contract.claimReward()); }

// Auto refresh data every 10s
setInterval(loadData,10000);

// Init chart on page load
window.onload = initChart;
</script>

</body>
</html>
