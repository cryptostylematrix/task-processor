import { Address, Cell, toNano } from "@ton/core";
import { placesRepository, type NewPlace, type PlaceRow } from "../repositories/placesRepository";
import { tonConfig } from "../config";
import { LockRow, locksRepository, NewLock } from "../repositories/locksRepository";
import { logger } from "../logger";
import { MarketingTaskResponse, MultiTaskItemResponse, PlacePosDataResponse } from "../api/contractsApi";
import { getMaxPlaceNumber, getPlaceByTaskKey, getPlacesCount, getTotalPlaceCount, marketingApi, MarketingNextPos, MarketingPlace } from "../api/marketingApi";
import { fetchMatrixPlaceData, fetchInviterProfileAddr, fetchPlaceAddress, fetchProfileContent, fetchProfileData, sendPaymentToMarketing, waitForNewSeqno, fetchDeployPlaceBody, fetchCancelTaskBody, fetchPayBonusBody, waitForTaskCanceled, fetchFirstTask } from "./contractsService";
import { DEFAULT_RETRIES } from "../utils/retry";



// Single multi queue address from env or config
const WATCHED_MARKETING_ADDRESS: string = tonConfig.marketingQueueAddress;
const NEO_PROGRAM = 0x435acabf;


export class TaskProcessor {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lastProcessedTaskKey: number | null = null;
  private lastProcessedTaskKeyAttempts = 0;

  async run(): Promise<void> {
    if (this.timer) {
      return;
    }

    await logger.info(`MarketingTaskProcessor: scheduling every 2 seconds for multi ${WATCHED_MARKETING_ADDRESS || "<none>"}.`);

    const runOnce = async (): Promise<void> => {
      if (this.running) {
        return;
      }
      this.running = true;
      try {
        const result = await this.prcoessLastTask();
        if (!result) {
          this.timer = null;
          return;
        }
      } catch (error) {
        await logger.error(`MarketingTaskProcessor run failed: ${error}`);
        this.timer = null;
        return;
      } finally {
        this.running = false;
      }

      this.timer = setTimeout(() => {
        void runOnce();
      }, 3000);
    };

    // Run immediately, then schedule subsequent runs after each completes.
    void runOnce();
  }

  private async prcoessLastTask(): Promise<boolean> {
    if (!WATCHED_MARKETING_ADDRESS) {
      return false;
    }

    const rawMarketingAddress = WATCHED_MARKETING_ADDRESS;

    try {
      const unconfirmedPlacesCount = await placesRepository.getUnconfirmedPlacesCount(rawMarketingAddress);
      if (unconfirmedPlacesCount > 0) {
        await logger.error(`[MarketingTaskProcessor] found ${unconfirmedPlacesCount} unconfirmed place(s) in db for marketing=${rawMarketingAddress}`);
        return false;
      }

      const firstTask = await fetchFirstTask(rawMarketingAddress);
      if (!firstTask || firstTask.flag == 0) {
        await logger.info(`[MarketingTaskProcessor] last: <empty>`);
        return true;
      }

      const taskKey = firstTask.key!;
      const taskVal= firstTask.val!;

      if (!this.lastProcessedTaskKey || this.lastProcessedTaskKey != taskKey) {
        this.lastProcessedTaskKey = taskKey;
        this.lastProcessedTaskKeyAttempts = 0;
      } else {
        this.lastProcessedTaskKeyAttempts += 1;

        const attempt = this.lastProcessedTaskKeyAttempts;
        const maxAttempts = DEFAULT_RETRIES;
        const waitMs = 2000 * (2 ** (attempt - 1));

        if (attempt < maxAttempts) {
          await logger.info(`[MarketingTaskProcessor] lastTaskKey=${taskKey} has not updated yet (attempt ${attempt}/${maxAttempts}), waiting ${waitMs / 1000}s`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          return true;
        }

        await logger.error(`[MarketingTaskProcessor] lastTaskKey=${taskKey} eventually not updated (attempt ${attempt}/${maxAttempts})`);
        return false;
      }

      // buy_place
      if (taskVal.payload.tag === 1) {
        const payload = taskVal.payload;

        // check first parameter
        const totalPlaceNumber = await getTotalPlaceCount(
          rawMarketingAddress, 
          taskVal.profile_addr
        );

        const isFirstPlaceTask = payload.first === true;
        if (isFirstPlaceTask && totalPlaceNumber > 0) {
          await logger.error(`[MarketingTaskProcessor] invalid first place task for profile ${taskVal.profile_addr}: total places count is ${totalPlaceNumber} (task key=${taskKey})`);
          await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "First place task received when profile already has places");
          return false;
        }

        if (!isFirstPlaceTask && totalPlaceNumber === 0) {
          await logger.error(`[MarketingTaskProcessor] invalid non-first place task for profile ${taskVal.profile_addr}: total places count is 0 (task key=${taskKey})`);
          await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "Non-first place task received when profile has no places");
          return false;
        }

        const created = await this.createPlace(rawMarketingAddress, taskKey, taskVal, payload.pos ?? null);
        if (!created) {
          return false;
        }
      }


      // create_clone
      else if (taskVal.payload.tag === 2) {
        const created = await this.createPlace(rawMarketingAddress, taskKey, taskVal);
        if (!created) {
          return false;
        }
      }

      // lock_pos
      else if (taskVal.payload.tag === 3) {
          if (!taskVal.payload.pos)
          {
              await this.logLockErr("pos is not set", taskKey, taskVal);
              await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "pos is not set");
              return false;
          }

          // validation
          const profileData = await fetchProfileData(taskVal.profile_addr);
          if (!profileData || !profileData.owner_addr)
          {
            await this.logLockErr("failed to load profile data", taskKey, taskVal);
            await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "failed to load profile data");
            return false;
          }

          if (taskVal.payload.source_addr != profileData.owner_addr)
          {
            await this.logLockErr("unauthorized sender", taskKey, taskVal);
            await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "unauthorized sender");
            return false;
          }

          const rootPlace = await this.findRootPlace(rawMarketingAddress, taskVal.m, taskVal.profile_addr);
          if (!rootPlace)
          {
              await this.logLockErr("failed to fetch root place", taskKey, taskVal);
              await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "failed to fetch root place");
              return false;
          }

          const placeRow = await placesRepository.getPlaceByAddress(
            rawMarketingAddress,
            taskVal.payload.pos.parent_addr);
            
          if (!placeRow)
          {
              await this.logLockErr("failed to get place", taskKey, taskVal);
              await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "failed to get place");
              return false;
          }

          if (placeRow.m != taskVal.m)
          {
              await this.logLockErr(`place is in the diff matrix`, taskKey, taskVal);
              await this.cancelTask(rawMarketingAddress, taskKey, taskVal, `place is in the diff matrix`);
              return true;
          }

          const rootPlaceInt = await placesRepository.getPlaceByAddress(rawMarketingAddress, rootPlace.addr);
          if (!rootPlaceInt){
            await this.logLockErr(`cannot load root place info`, taskKey, taskVal);
            await this.cancelTask(rawMarketingAddress, taskKey, taskVal, `cannot load root place info`);
            return false;
          }
          
          if (!placeRow.mp.startsWith(rootPlaceInt.mp))
          {
              await this.logLockErr("place is in the diff subtree", taskKey, taskVal);
              await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "place is in the diff subtree");
              return false;
          }

          if (placeRow.seq_no == 0)
          {
              await this.logLockErr("empty place", taskKey, taskVal);
              await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "empty place");
              return false;
          }

          const placeAddr = taskVal.payload.pos.parent_addr;
          const lockedPos = taskVal.payload.pos.pos;
          const profileAddr = taskVal.profile_addr;

          const existingLock = await marketingApi.getLockByPlaceAddrAndLockedPos(rawMarketingAddress, placeAddr, lockedPos, profileAddr);
          if (existingLock)
          {
              await this.logLockErr(`duplicate lock`, taskKey, taskVal);
              await this.cancelTask(rawMarketingAddress, taskKey, taskVal, `duplicate lock`);
              await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
              await logger.info('----------------------------------------------------------------------');
              return true;
          }

          const otherPosLock = await marketingApi.getLockByPlaceAddrAndLockedPos(rawMarketingAddress, placeAddr, lockedPos == 0 ? 1 : 0, profileAddr);
          if (otherPosLock)
          {
              await this.logLockErr(`sibling pos is already locked`, taskKey, taskVal);
              await this.cancelTask(rawMarketingAddress, taskKey, taskVal, `sibling pos is already locked`);
              return false;
          }

        
          // processing
          const createResult = await this.createLockFromTask(taskKey, taskVal, placeRow, taskVal.payload.pos.pos);

          await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "lock successfully set");
       
          await locksRepository.updateLockConfirm(rawMarketingAddress, createResult.id);
          await logger.info(`[MarketingTaskProcessor] updated lock #${createResult.id} with confirmed`);
      }

      // unlock_pos
      else if (taskVal.payload.tag === 4) {
          if (!taskVal.payload.pos)
          {
              await this.logUnlockErr("pos is not set", taskKey, taskVal);
              await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "pos is not set");
              return false;
          }

          const profileData = await fetchProfileData(taskVal.profile_addr);
          if (!profileData || !profileData.owner_addr)
          {
            await this.logUnlockErr("failed to load profile data", taskKey, taskVal);
            await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "failed to load profile data");
            return false;
          }

          if (taskVal.payload.source_addr != profileData.owner_addr)
          {
            await this.logUnlockErr("unauthorized sender", taskKey, taskVal);
            await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "unauthorized sender");
            return false;
          }

          const placeAddr = taskVal.payload.pos.parent_addr;
          const lockedPos = taskVal.payload.pos.pos;
          const profileAddr = taskVal.profile_addr;

          const lockInt = await locksRepository.getLockByPlaceAddrAndLockedPos(rawMarketingAddress,  placeAddr, lockedPos, profileAddr);
          if (!lockInt)
          {
              await this.logUnlockErr("lock not found", taskKey, taskVal);
              await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "lock not found");
              await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
              await logger.info('----------------------------------------------------------------------');
              return true;
          }

         
          await this.cancelTask(rawMarketingAddress, taskKey, taskVal, "lock successfully removed");
          await locksRepository.removeLock(rawMarketingAddress, lockInt.id);

          //await locksRepository.removeLockByPlaceAddrAndLockedPos(rawMarketingAddress, placeAddr, lockedPos, profileAddr);

          await logger.info(`[MarketingTaskProcessor] removed lock for place=${placeAddr} pos=${lockedPos} profile=${profileAddr}`);
      }
      
      // pay_bonus
      else if (taskVal.payload.tag == 5) {
        const paid = await this.payJettonBonus(rawMarketingAddress, taskKey, taskVal);
        if (!paid) {
          return false;
        }
      }

      // reinvest
      else if (taskVal.payload.tag === 6) {
        const created = await this.createPlace(rawMarketingAddress, taskKey, taskVal);
        if (!created) {
          return false;
        }
      }

      // move_or_bonus
      else if (taskVal.payload.tag === 7) {
        const placeCount = await getPlacesCount(rawMarketingAddress, taskVal.m + 1, taskVal.profile_addr);
        if (placeCount > 0)
        {
          const paid = await this.payJettonBonus(rawMarketingAddress, taskKey, taskVal);
          if (!paid) {
            return false;
          }
        }
        else
        {
          const created = await this.createPlace(rawMarketingAddress, taskKey, taskVal, null, taskVal.m + 1);
          if (!created) {
            return false;
          }
        }
      }

      else 
      {
        await logger.error(`[MarketingTaskProcessor] unsupported tag (key = ${taskKey})`);
        return false;
      }

      await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
      await logger.info('----------------------------------------------------------------------');
      return true;

    } catch (error) {
      await logger.error(`[MarketingTaskProcessor] failed to process last task: ${error}`);
      return false;
    }
  }


  




  private async createPlace(rawMarketingAddress: string, taskKey: number, taskVal: MarketingTaskResponse, fixedPos?: PlacePosDataResponse | null, targetMatrix = taskVal.m): Promise<boolean> {
      const existing = await getPlaceByTaskKey(rawMarketingAddress, taskKey);
      if (existing) {
        await logger.error(`[MarketingTaskProcessor] skipping task key=${taskKey} because place already exists`);
        return false;
      }

      const rootPlace = await this.findRootPlace(
        rawMarketingAddress, 
        targetMatrix,
        taskVal.profile_addr
      );
    
      if (!rootPlace) {
        await logger.error(`[MarketingTaskProcessor] unable to resolve root place for profile ${taskVal.profile_addr} (m=${targetMatrix}, task key=${taskKey})`);
        return false;
      }

      await logger.info(`[MarketingTaskProcessor] resolved root place for profile ${taskVal.profile_addr}} (m=${targetMatrix}): address = ${rootPlace.addr}`);

      let parentRow: PlaceRow | null;
      let childPos: number;

      if (fixedPos) {
        await logger.info(`[MarketingTaskProcessor] fixed pos is set for create_place to parent=${fixedPos.parent_addr} pos=${fixedPos.pos} (task key=${taskKey})`);

        parentRow = await placesRepository.getPlaceByAddress(rawMarketingAddress, fixedPos.parent_addr);
        if (!parentRow) {
          await logger.error(`[MarketingTaskProcessor] fixed parent cannot be found (task key=${taskKey})`);
          return false;
        }

        if (parentRow.m !== targetMatrix) {
          await logger.error(`[MarketingTaskProcessor] fixed parent is in a different matrix (task key=${taskKey})`);
          return false;
        }

        const rootRow = await placesRepository.getPlaceByAddress(rawMarketingAddress, rootPlace.addr);
        if (!rootRow) {
          await logger.error(`[MarketingTaskProcessor] root place row cannot be found (task key=${taskKey})`);
          return false;
        }

        if (!parentRow.mp.startsWith(rootRow.mp)) {
          await logger.error(`[MarketingTaskProcessor] fixed parent is in a different structure (task key=${taskKey})`);
          return false;
        }

        const nextAvailablePos = Number(parentRow.seq_no) + 1;
        if (fixedPos.pos !== nextAvailablePos) {
          await logger.error(`[MarketingTaskProcessor] selected pos=${fixedPos.pos} is not available; next pos=${nextAvailablePos} (task key=${taskKey})`);
          return false;
        }

        childPos = fixedPos.pos;
      } else {
        const nextPos = await marketingApi.getNextPos(rawMarketingAddress, rootPlace.m, rootPlace.profile_addr);
        if (!nextPos) {
          await logger.error(`[MarketingTaskProcessor] next position not found for profile ${taskVal.profile_addr} (m=${targetMatrix})`);
          return false;
        }

        await logger.info(`[MarketingTaskProcessor] next position for profile ${taskVal.profile_addr} (m=${targetMatrix}): parent= ${nextPos.parent_addr} pos=${nextPos.pos}`);

        parentRow = await placesRepository.getPlaceByAddress(rawMarketingAddress, nextPos.parent_addr);
        if (!parentRow) {
          throw "Parent row not foiund";
        }

        childPos = nextPos.pos;
      }

      const parentDataBefore = await fetchMatrixPlaceData(parentRow.addr);
      const createResult = await this.createPlaceFromTask(rawMarketingAddress, taskKey, taskVal, parentRow, childPos, targetMatrix);

      const deployBody = await fetchDeployPlaceBody({
        queryId: taskVal.query_id,
        key: taskKey,
        parentAddr: parentRow.addr,
        kind: createResult.kind,
        profileAddr: taskVal.profile_addr,
        placeNumber: Number(createResult.place_number),
        inviterProfileAddr: createResult.inviter_profile_addr
      });

      if (!deployBody || !deployBody.boc_hex)
      {
        await logger.error(`[MarketingTaskProcessor] could not retrieve body for deploy place cmd; task key:${taskKey}`);
        return false;
      }

      await sendPaymentToMarketing(rawMarketingAddress, taskKey, Cell.fromHex(deployBody.boc_hex), toNano('0.5'));
      await logger.info(`[MarketingTaskProcessor] sent 0.5 TON from processor wallet to marketing for task key=${taskKey}`);

      const newChildAddr = await waitForNewSeqno(parentRow.addr, parentDataBefore);
      if (!newChildAddr)
      {
        await logger.error(`[MarketingTaskProcessor] could not get the new child's data of parent ${parentRow.addr}`);
        return false;
      }

      await placesRepository.updateConfirm(createResult.id);
      await logger.info(`[MarketingTaskProcessor] updated place #${createResult.id} with on-chain address ${newChildAddr} and confirmed`);
      return true;
  }

  private async payJettonBonus(rawMarketingAddress: string, taskKey: number, taskVal: MarketingTaskResponse): Promise<boolean> {
      const profileData = await fetchProfileData(taskVal.profile_addr);

      if (!profileData?.owner_addr)
      {
        await logger.error(`[MarketingTaskProcessor] cannot find out profile wallet (task key=${taskKey})`);
        return false;
      }

      const payBonusBodyResponse = await fetchPayBonusBody({
        queryId: taskVal.query_id,
        key: taskKey,
        walletAddr: profileData.owner_addr,
      });

      if (!payBonusBodyResponse?.boc_hex) {
        await logger.error(`[MarketingTaskProcessor] could not retrieve body for pay bonus cmd; task key=${taskKey}`);
        return false;
      }

      const payBonusBody = Cell.fromHex(payBonusBodyResponse.boc_hex);
      await sendPaymentToMarketing(rawMarketingAddress, taskKey, payBonusBody, toNano('0.5'));
      await logger.info(`[MarketingTaskProcessor] sent 0.5 TON from processor wallet to marketing for task key=${taskKey}`);
      return true;
  }

  private async cancelTask(rawMarketingAddress: string, taskKey: number, taskVal: MarketingTaskResponse, comment: string)
  {
      const cancelBodyResponse = await fetchCancelTaskBody({
        queryId: taskVal.query_id,
        key: taskKey,
        comment,
      });

      if (!cancelBodyResponse?.boc_hex) {
        throw new Error(`Could not retrieve cancel task body for task key=${taskKey}`);
      }

      const cancelBody = Cell.fromHex(cancelBodyResponse.boc_hex);
      await sendPaymentToMarketing(rawMarketingAddress, taskKey, cancelBody, toNano("0.5"));
      await logger.info(`[MarketingTaskProcessor] sent 0.5 TON from processor wallet to marketing for cancel task key=${taskKey}`);
      await waitForTaskCanceled(rawMarketingAddress, taskKey);
  }

  private async logLockErr(err: string, taskKey: number, taskVal: MultiTaskItemResponse)
  {
    await logger.error(`[MarketingTaskProcessor] [lock_pos]: ${err}; profile = ${taskVal.profile_addr}  m = ${taskVal.m}  parent = ${taskVal.payload.pos?.parent_addr}  (key = ${taskKey})`);
  }

  private async logUnlockErr(err: string, taskKey: number, taskVal: MultiTaskItemResponse)
  {
    await logger.error(`[MarketingTaskProcessor] [unlock_pos]: ${err}; profile = ${taskVal.profile_addr}  m = ${taskVal.m}  parent = ${taskVal.payload.pos?.parent_addr}  (key = ${taskKey})`);
  }

  private async findRootPlace(rawMarketingAddress: string, m: number, rawPofileAddr: string): Promise<MarketingPlace | null> {

    // get root of the profile
    const rootPlace = await marketingApi.getRootPlace(rawMarketingAddress, m, rawPofileAddr);
    if (rootPlace) {
      return rootPlace;
    }

    // get profile of the inviter
    const inviterProfile = await fetchInviterProfileAddr(rawPofileAddr, NEO_PROGRAM);
    if (!inviterProfile) {
      await logger.error(`[MarketingTaskProcessor] profile ${rawPofileAddr} has not chosen inviter yet`);
      return null;
    }

    return this.findRootPlace(rawMarketingAddress, m, inviterProfile);
  }

  private async createPlaceFromTask(rawMarketingAddress: string, taskKey: number, taskVal: MarketingTaskResponse, parentRow: PlaceRow, childPos: number, targetMatrix: number): Promise<PlaceRow> {

    const profileContent = await fetchProfileContent(taskVal.profile_addr);
    if (!profileContent) {
      throw new Error(`Profile content missing for ${taskVal.profile_addr}`);
    }

    const placeNumber =(await getMaxPlaceNumber(rawMarketingAddress, targetMatrix, taskVal.profile_addr)) + 1;

    // calc placeAddr
    const placeAddrRes = await fetchPlaceAddress(rawMarketingAddress, targetMatrix, parentRow.addr, childPos);
    if (!placeAddrRes) {
      throw new Error(`Cannto detetmain place addr`);
    }

    const mp = `${parentRow.mp}${childPos.toString(16).toUpperCase().padStart(8, "0")}`;

    const rawInviterProfileAddr = await fetchInviterProfileAddr(taskVal.profile_addr, NEO_PROGRAM);

    const payload = taskVal.payload;
    
    const kind = payload.tag === 2 ? 1 : 0;

    const newPlace: NewPlace = {
      marketing_addr: rawMarketingAddress,
      m: targetMatrix,
      profile_addr: taskVal.profile_addr,
      address: placeAddrRes.addr,
      parent_address: parentRow.addr,
      parent_id: parentRow.id,
      mp,
      pos: childPos,
      seq_no: 0,
      width: parentRow.width,
      height: parentRow.height,
      kind: kind,
      place_number: placeNumber,
      created_at: Date.now(),
      login: profileContent.login,
      task_key: taskKey,
      task_query_id: Number(taskVal.query_id ?? 0),
      task_source_addr: payload.source_addr,
      inviter_profile_addr: rawInviterProfileAddr,
      confirmed: false
    };

    const result = await placesRepository.addPlace(newPlace);
    await placesRepository.incrementSeqNo(rawMarketingAddress, parentRow.id);
   
    await logger.info(`[MarketingTaskProcessor] created place for profile ${newPlace.profile_addr}: parent=${parentRow.addr}`);
    return result;
  }

  private async createLockFromTask(taskKey: number, taskVal: MultiTaskItemResponse, placeRow: PlaceRow, lockedPos: number): Promise<LockRow> {

    const mp = `${placeRow.mp}${lockedPos.toString(16).toUpperCase().padStart(8, "0")}`;

    const newLock: NewLock = {
        marketing_addr: placeRow.marketing_addr,
        mp: mp,
        m: placeRow.m,
        profile_addr: taskVal.profile_addr,
        place_addr: placeRow.addr,
        locked_pos: lockedPos,
        place_profile_login: placeRow.profile_login,
        place_number: placeRow.place_number,

        task_key: taskKey,
        task_query_id: taskVal.query_id,
        task_source_addr: taskVal.payload.source_addr ?? null,

        created_at: Date.now(),
        confirmed: false,
    };

    const result = await locksRepository.addLock(newLock);
    await logger.info(`[MarketingTaskProcessor] [lock_pos] created lock for profile ${newLock.profile_addr}: place=${newLock.place_addr}`);
    return result;
  }
}
