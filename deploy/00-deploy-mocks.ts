import {ethers} from "hardhat"
import {DeployFunction} from "hardhat-deploy/types"
import {HardhatRuntimeEnvironment} from "hardhat/types"
import {networkConfig} from "../helper-hardhat-config"

const BASE_FEE = "250000000000000000"
const GAS_PRICE_LINK = 1e9;

const deployMocks: DeployFunction = async function(hre: HardhatRuntimeEnvironment){
	const {deployments, getNamedAccounts, network} = hre
	console.log(`${network.config}`)
	const {deploy, log} = deployments
	const {deployer} = await getNamedAccounts()
	const chainId = network.config.chainId 
	if(chainId == 31337){
		log("Local Network Detected! Depploying mocks...");
		await deploy("VRFCoordinatorV2Mock", {
			from: deployer,
			log: true,
			args: [BASE_FEE, GAS_PRICE_LINK],
		})

		log("Mocks Deployed!")
		log("------------------------")
		log("You are deploying to a local network, you'll need a local network running to interact")
        log("For performing interacting acts  with the deployed smart contracts, run `yarn hardhat console --network localhost` ")
        log("----------------------------------")

	}
}
export default deployMocks;
deployMocks.tags = ["all", "mocks"]