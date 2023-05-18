import { ethers } from "hardhat";

const OGXT_SIM_TSLA_POOL_CONTRACT_ADDR = "0x45581064DE5264f458C59bbF861BA01142cC5b0b";
const OGXT_TOKEN_ADDR = "0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2";
const SIM_TSLA_TOKEN_ADDR = "0xBca5De3E6Ea3B39770C0a6EF3793e8fA6424031e";

async function main() {
  const calibratorFactory = await ethers.getContractFactory("Calibrator");
  
  const calibratorContract = await calibratorFactory.deploy(
    OGXT_SIM_TSLA_POOL_CONTRACT_ADDR,
    OGXT_TOKEN_ADDR,
    SIM_TSLA_TOKEN_ADDR,
  );
  
  console.log('"Calibrator" was deployed with:');
  console.log(`Address: ${calibratorContract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
