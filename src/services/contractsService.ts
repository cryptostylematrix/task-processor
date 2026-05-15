import { Address, Cell, Dictionary, internal } from "@ton/core";
import { getTonClient, limited } from "./tonClient";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV4, type OpenedContract } from "@ton/ton";
import { tonConfig } from "../config";
import { retryExp } from "../utils/retry";
import { logger } from "../logger";
import { buildMarketingCancelTaskBody, buildMarketingDeployPlaceBody, buildMarketingPayBonusBody, BuildMarketingCancelTaskBodyRequest, BuildMarketingDeployPlaceBodyRequest, BuildMarketingPayBonusBodyRequest, CancelTaskBodyResponse, DeployPlaceBodyResponse, FirstTaskResponse, getInviteData, getMarketingFirstTask, getMatrixPlaceData, getPlaceData, getProfileNftData, getProfilePrograms, MatrixPlaceDataResponse, PayBonusBodyResponse, PlaceDataResponse, ProfileContentResponse, ProfileDataResponse, ProgramDataResponse } from "../api/contractsApi";
import { getPlaceAddress, MarketingPlaceAddress } from "../api/marketingApi";

const normalizeProgramCode = (program: number | string) => {
  if (typeof program === "number") {
    return program.toString(16).toUpperCase().padStart(8, "0");
  }

  return program.replace(/^0x/i, "").toUpperCase();
};


const findProgramData = (
  programs: Array<Record<string, ProgramDataResponse>>,
  program: number | string,
) => {
  const normalizedProgramCode = normalizeProgramCode(program);

  for (const program of programs) {
    const entry = Object.entries(program).find(([key]) => key.toUpperCase() === normalizedProgramCode);
    if (entry) return entry[1];
  }

  return null;
};

export const fetchMatrixPlaceData = async (placeAddr: string): Promise<MatrixPlaceDataResponse | null> => {
  const placeData = await retryExp(() => limited(() => getMatrixPlaceData(placeAddr)));
  return placeData;
};

export const fetchDeployPlaceBody = async(request: BuildMarketingDeployPlaceBodyRequest): Promise<DeployPlaceBodyResponse | null> => {
  const deployPlaceBody = await retryExp(() => limited(() => buildMarketingDeployPlaceBody(request)));
  return deployPlaceBody;
}

export const fetchCancelTaskBody = async(request: BuildMarketingCancelTaskBodyRequest): Promise<CancelTaskBodyResponse | null> => {
  const cancelTaskBody = await retryExp(() => limited(() => buildMarketingCancelTaskBody(request)));
  return cancelTaskBody;
}

export const fetchPayBonusBody = async(request: BuildMarketingPayBonusBodyRequest): Promise<PayBonusBodyResponse | null> => {
  const payBonusBody = await retryExp(() => limited(() => buildMarketingPayBonusBody(request)));
  return payBonusBody;
}

export const fetchTotalPlacesCount = async(request: BuildMarketingDeployPlaceBodyRequest): Promise<DeployPlaceBodyResponse | null> => {
  const deployPlaceBody = await retryExp(() => limited(() => buildMarketingDeployPlaceBody(request)));
  return deployPlaceBody;
}

// export const fetchProgram = async (profileAddr: Address, program: number): Promise<ProgramData | null> => {
//   const client = getTonClient();
//   const profile = ProfileItemV1.createFromAddress(profileAddr);
//   const provider = client.provider(profileAddr);

//   const profileData = await retryExp(() => limited(() => profile.getPrograms(provider)));

//   if (!profileData.programs) {
//     return null;
//   }

//   const programs = Dictionary.loadDirect(
//     Dictionary.Keys.Uint(32),
//     ProgramDataCodec,
//     profileData.programs,
//   );

//   return programs.get(program) ?? null;
// };

export const fetchPlaceAddress = async (rawMarketingAddr: string, m: number, rawParentAddr: string, pos: number): Promise<MarketingPlaceAddress | null> => {
  const res = await retryExp(() => limited(() => getPlaceAddress(rawMarketingAddr, m, rawParentAddr, pos)));
  return res;
}

export const fetchInviterProfileAddr = async (rawProfileAddr: string, program: number | string): Promise<string | null> => {
  const programs = await retryExp(() => limited(() => getProfilePrograms(rawProfileAddr)));
  if (!programs)
  {
    return null;
  }

  const programData = findProgramData(programs, program);

  if (!programData || !programData.confirmed) {
    return null;
  }


  const inviterData = await retryExp(() => limited(() => getInviteData(programData.inviter_addr)));

  const inviterProfile = inviterData?.owner?.owner_addr;
  return inviterProfile ?? null;
};

export const fetchFirstTask = async (rawMarketingAddr: string): Promise<FirstTaskResponse | null> => {
  const firstTask = await retryExp(() => limited(() => getMarketingFirstTask(rawMarketingAddr)));
  return firstTask;
};

export const fetchProfileContent = async (rawProfileAddr: string): Promise<ProfileContentResponse | null | undefined> => {
  const profileData = await fetchProfileData(rawProfileAddr);
  return profileData?.content;
};

export const fetchProfileData = async (rawProfileAddr: string): Promise<ProfileDataResponse | null> => {
  const profileData = await retryExp(() => limited(() => getProfileNftData(rawProfileAddr)));
  return profileData;
};

export const waitForNewSeqno = async (placeAddr: string, prevData: MatrixPlaceDataResponse | null, timeoutMs = 120000, intervalMs = 1000,): Promise<number | null> => {
  const start = Date.now();
  const prevSeqno = prevData?.seq_no ?? 0;
  
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const current = await fetchMatrixPlaceData(placeAddr);

    if (current) {
      const currSeqno = current.seq_no ?? 0;
      
        if (currSeqno > prevSeqno) {
          return currSeqno;
        }
        return null;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timeout waiting for new child at ${placeAddr}`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

let lastPaidTaskKey: number | null = null;
let lastKnownSeqno: number | null = null;

export const waitForSeqno = async (wallet: OpenedContract<WalletContractV4>, prevSeqno: number, timeoutMs = 30000, intervalMs = 1000): Promise<number> => {
  const start = Date.now();
  while (true) {
    const current = await retryExp(() => limited(() => wallet.getSeqno()));

    if (current > prevSeqno) {
      return current;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error("Timeout waiting for wallet seqno to increment");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

export const sendPaymentToMarketing = async (toAddress: string, taskKey: number, body: Cell, value: bigint): Promise<void> => {
  if (lastPaidTaskKey === taskKey) return;

  const client = getTonClient();
  const keyPair = await mnemonicToPrivateKey(tonConfig.processorMnemonic.trim().split(/\s+/));

  const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
  const openedWallet = client.open(wallet);

  const seqno = lastKnownSeqno ?? await retryExp(() => limited(() => openedWallet.getSeqno()));

  const transfer = {
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: toAddress,
        value,
        body,
        bounce: true,
      }),
    ],
  };

  await retryExp(async () => {
    try {
      await logger.info(`[TON] trying sendTransfer with seqno=${seqno}`);
      await limited(() => openedWallet.sendTransfer(transfer));
    } catch (error) {
      const currentSeqno = await retryExp(() => limited(() => openedWallet.getSeqno()), 2, 300);
      await logger.warn(`[TON] sendTransfer failed, seqno=${seqno}, currentSeqno=${currentSeqno}, retrying with the same seqno`);
      throw error;
    }
  });

  lastKnownSeqno = await waitForSeqno(openedWallet, seqno);
  lastPaidTaskKey = taskKey;
};

export const waitForTaskCanceled = async (rawMarketingAddress: string, prevKey: number, timeoutMs = 120000, intervalMs = 1000): Promise<number | null | undefined> => {
  const start = Date.now();
  
  // eslint-disable-next-line no-constant-condition
  let attempt = 0;
  while (true) {

    const current = await fetchFirstTask(rawMarketingAddress);
    await logger.info(`[MarketingTaskProcessor] waiting until task canceled prev = ${prevKey}  current= ${current?.key} (attepmt = ${++attempt}) ...`);

    if (current) {
      const currKey = current.key;

      if (currKey != prevKey) {
        return currKey;
      }
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timeout waiting for new task`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};
