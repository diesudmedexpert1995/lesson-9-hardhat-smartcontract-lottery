import {frontEndContractsFile, frontEndAbiFile} from "../helper-hardhat-config"
import fs from "fs"
import {DeployFunction} from "hardhat-deploy/types"
import {HardhatRuntimeEnvironment} from "hardhat/types";

const updateUI: DeployFunction = async function(hre: HardhatRuntimeEnvironment){
    const {network, ethers} = hre;
    const chainId = "31337"
    if(process.env.UPDATE_FRONTEND){
        console.log("Writing to frontend...")
        const raffle = await ethers.getContract("Raffle")
        const raffleAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile,"utf8"))
        if(chainId in raffleAddresses){
            if(!raffleAddresses[network.config.chainId!].includes(raffle.address)){
                raffleAddresses[network.config.chainId!].push(raffle.address);
            }
        }else{
            raffleAddresses[network.config.chainId!] = [raffle.address]
        }
        fs.writeFileSync(frontEndContractsFile, JSON.stringify(raffleAddresses))
        fs.writeFileSync(frontEndAbiFile, raffle.interface.format(ethers.utils.FormatTypes.json))
        console.log("Front end is written!")
    }
}
export default updateUI;
updateUI.tags = ["all", "frontend"]
