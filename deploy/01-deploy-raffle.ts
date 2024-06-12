import {DeployFunction} from "hardhat-deploy/types"
import {HardhatRuntimeEnvironment} from "hardhat/types"
import verify from "../utils/verify"

import {networkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS} from "../helper-hardhat-config"
const FUND_AMOUNT = "10000000000000000000000"

const deployRaffle: DeployFunction = async function(hre: HardhatRuntimeEnvironment){
	const {deployments, getNamedAccounts, network, ethers} = hre
	const {deploy, log} = deployments
	const {deployer} = await getNamedAccounts()
	const chainId = network.config.chainId
	let vrfCoordinatorV2Address: string | undefined, subscriptionId: string | undefined
	log("Raffle smartcontract deployment... ")
	if(chainId == 31337){
		//log("Debug point 1 ... ")//improv debug point 1
		const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
		vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
		const transactionResponse = await vrfCoordinatorV2Mock.createSubscription()
		const transactionReceipt = await transactionResponse.wait()
		subscriptionId = transactionReceipt.events[0].args.subId
		await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)

	}else{
		vrfCoordinatorV2Address = networkConfig[network.config.chainId!]["vrfCoordinatorV2"]
		subscriptionId = networkConfig[network.config.chainId!]["subscriptionId"]
	}

	//log("Debug point 2... ")//improv debug point 2
	const waitBlockConfirmations = developmentChains.includes(network.name)?1:VERIFICATION_BLOCK_CONFIRMATIONS
	//log("Debug point 3... "+`${waitBlockConfirmations}`)//improv debug point 3
	const args: any[] = [
		vrfCoordinatorV2Address,
		subscriptionId,
		networkConfig[network.config.chainId!]["gasLane"],
		networkConfig[network.config.chainId!]["keepersUpdateInterval"],
		networkConfig[network.config.chainId!]["raffleEntranceFee"],
		networkConfig[network.config.chainId!]["callbackGasLimit"]
	]

	//log("Debug point 4... "+`${args}`)//improv debug point 4

	const raffle = await deploy("Raffle", {
		from: deployer,
		args: args,
		log: true,
		waitConfirmations: waitBlockConfirmations,  
	})

	if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
    }

	if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY){
		log("Verifying...")
		await verify(raffle.address, args)
	}
	log("Run Price Feed contract with command:")
    const networkName = network.name == "hardhat" ? "localhost" : network.name
    log(`yarn hardhat run scripts/enterRaffle.ts --network ${networkName}`)
    log("----------------------------------------------------")
}
export default deployRaffle
deployRaffle.tags = ["all", "raffle"]
