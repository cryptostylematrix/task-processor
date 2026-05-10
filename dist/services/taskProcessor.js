"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskProcessor = void 0;
const config_1 = require("../config");
const logger_1 = require("../logger");
const contractsApi_1 = require("../api/contractsApi");
// Single multi queue address from env or config
const WATCHED_MARKETING_ADDRESS = config_1.tonConfig.marketingQueueAddress;
class TaskProcessor {
    constructor() {
        this.timer = null;
        this.running = false;
        this.lastProcessedTaskKey = null;
        this.lastProcessedTaskKeyAttempts = 0;
        //   private async cancelTask(rawMultiAddress: string, taskKey: number, taskVal: MultiTaskItem)
        //   {
        //       const cancelBody = Multi.cancelTaskMsg(taskKey, taskVal.query_id);
        //       await sendPaymentToMulti(rawMultiAddress, taskKey, cancelBody, toNano("0.5"));
        //       await logger.info(`[MarketingTaskProcessor] sent 0.5 TON from processor wallet to multi for task key=${taskKey}`);
        //       await waitForTaskCanceled(rawMultiAddress, taskKey);
        //   }
        //   private async logLockErr(err: string, taskKey: number, taskVal: MultiTaskItem)
        //   {
        //     const lockPosPayload = taskVal.payload as MultiTaskLockPosPayload;
        //     await logger.error(`[MarketingTaskProcessor] [lock_pos]: ${err}; profile = ${this.toFriendly(taskVal.profile)}  m = ${taskVal.m}  parent = ${lockPosPayload.pos.parent}  (key = ${taskKey})`);
        //   }
        //   private async logUnlockErr(err: string, taskKey: number, taskVal: MultiTaskItem)
        //   {
        //     const lockPosPayload = taskVal.payload as MultiTaskUnlockPosPayload;
        //     await logger.error(`[MarketingTaskProcessor] [unlock_pos]: ${err}; profile = ${this.toFriendly(taskVal.profile)}  m = ${taskVal.m}  parent = ${lockPosPayload.pos.parent}  (key = ${taskKey})`);
        //   }
        //   private toFriendly(address: Address): string {
        //     return address.toString({ urlSafe: true, bounceable: true, testOnly: false });
        //   }
        //   private async findRootPlace(m: number, profileAddr: Address): Promise<PlaceRow | null> {
        //     const profileAddrStr = this.toFriendly(profileAddr);
        //     // get root of the profile
        //     const rootPlace = await placesRepository.getRootPlace(m, profileAddrStr);
        //     if (rootPlace) {
        //       return rootPlace;
        //     }
        //     // get profile of the inviter
        //     const inviterProfile = await fetchInviterProfileAddr(profileAddr);
        //     if (!inviterProfile) {
        //       await logger.error(`[MarketingTaskProcessor] profile ${profileAddr} has not chosen inviter yet`);
        //       return null;
        //     }
        //     return this.findRootPlace(m, inviterProfile);
        //   }
        //   private async createPlaceFromTask(taskKey: number, taskVal: MultiTaskItem, parentRow: PlaceRow): Promise<PlaceRow> {
        //     const profileContent = await fetchProfileContent(taskVal.profile);
        //     if (!profileContent) {
        //       throw new Error(`Profile content missing for ${this.toFriendly(taskVal.profile)}`);
        //     }
        //     const login = profileContent.login;
        //     const placeNumber =(await placesRepository.getMaxPlaceNumber(taskVal.m, this.toFriendly(taskVal.profile))) + 1;
        //     // Use current filling to pick next position: 0 -> left, 1 -> right.
        //     const childPos = (parentRow.filling % 2) as 0 | 1;
        //     const mp = `${parentRow.mp}${childPos}`;
        //     const inviterProfile = await fetchInviterProfileAddr(taskVal.profile);
        //     const payload = taskVal.payload;
        //     const taskSource = payload.tag === 1 || payload.tag === 3 || payload.tag === 4 ? this.toFriendly(payload.source) : null;
        //     const cloneFlag = payload.tag === 2 ? 1 : 0;
        //     const newPlace: NewPlace = {
        //       m: taskVal.m,
        //       profile_addr: this.toFriendly(taskVal.profile),
        //       address: "00",
        //       parent_address: parentRow.addr,
        //       parent_id: parentRow.id,
        //       mp,
        //       pos: childPos,
        //       place_number: placeNumber,
        //       created_at: Date.now(),
        //       clone: cloneFlag,
        //       login,
        //       task_key: taskKey,
        //       task_query_id: Number(taskVal.query_id ?? 0),
        //       task_source_addr: taskSource,
        //       inviter_profile_addr: inviterProfile ? this.toFriendly(inviterProfile) : null,
        //       confirmed: false,
        //     };
        //     const result = await placesRepository.addPlace(newPlace);
        //     await placesRepository.incrementFilling(parentRow.id);
        //     if (parentRow.parent_id !== null && parentRow.parent_id !== undefined) {
        //       await placesRepository.incrementFilling2(parentRow.parent_id);
        //     }
        //     await logger.info(`[MarketingTaskProcessor] created place for profile ${newPlace.profile_addr}: parent=${parentRow.addr}`);
        //     return result;
        //   }
        //   private async createLockFromTask(taskKey: number, taskVal: MultiTaskItem, placeRow: PlaceRow, lockedPos: number): Promise<LockRow> {
        //     const payload = taskVal.payload;
        //     const taskSource = payload.tag === 1 || payload.tag === 3 || payload.tag === 4 ? this.toFriendly(payload.source) : null;
        //     const mp = `${placeRow.mp}${lockedPos}`;
        //     const newLock: NewLock = {
        //         profile_addr: this.toFriendly(taskVal.profile),
        //         craeted_at: Date.now(),
        //         m: placeRow.m,
        //         mp: mp,
        //         place_addr: placeRow.addr,
        //         locked_pos: lockedPos,
        //         place_profile_login: placeRow.profile_login,
        //         place_number: placeRow.place_number,
        //         task_key: taskKey,
        //         task_query_id: Number(taskVal.query_id ?? 0),
        //         task_source_addr: taskSource,
        //         confirmed: false,
        //     };
        //     const result = await locksRepository.addLock(newLock);
        //     await logger.info(`[MarketingTaskProcessor] [lock_pos] created lock for profile ${newLock.profile_addr}: place=${newLock.place_addr}`);
        //     return result;
        //   }
    }
    async run() {
        if (this.timer) {
            return;
        }
        //await logger.info(`MarketingTaskProcessor: scheduling every 2 seconds for multi ${WATCHED_MARKETING_ADDRESS || "<none>"}.`);
        console.info(`MarketingTaskProcessor: scheduling every 2 seconds for multi ${WATCHED_MARKETING_ADDRESS || "<none>"}.`);
        const runOnce = async () => {
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
            }
            catch (error) {
                //await logger.error(`MarketingTaskProcessor run failed: ${error}`);
                console.error(`MarketingTaskProcessor run failed: ${error}`);
                this.timer = null;
                return;
            }
            finally {
                this.running = false;
            }
            this.timer = setTimeout(() => {
                void runOnce();
            }, 3000);
        };
        // Run immediately, then schedule subsequent runs after each completes.
        void runOnce();
    }
    async prcoessLastTask() {
        if (!WATCHED_MARKETING_ADDRESS) {
            return false;
        }
        const rawMarketingAddress = WATCHED_MARKETING_ADDRESS;
        try {
            //const firstTask = await fetchFirstTask(rawMarketingAddress);
            const firstTask = await (0, contractsApi_1.getMarketingFirstTask)(rawMarketingAddress);
            if (!firstTask || firstTask.flag == 0) {
                //await logger.info(`[MarketingTaskProcessor] last: <empty>`);
                console.info(`[MarketingTaskProcessor] last: <empty>`);
                return true;
            }
            const taskKey = firstTask.key;
            const taskVal = firstTask.val;
            if (!this.lastProcessedTaskKey || this.lastProcessedTaskKey != taskKey) {
                this.lastProcessedTaskKey = taskKey;
                this.lastProcessedTaskKeyAttempts = 0;
            }
            else {
                this.lastProcessedTaskKeyAttempts += 1;
                const attempt = this.lastProcessedTaskKeyAttempts;
                const maxAttempts = 5;
                const waitMs = 2000 * (2 ** (attempt - 1));
                if (attempt < maxAttempts) {
                    //await logger.info(`[MarketingTaskProcessor] lastTaskKey=${taskKey} has not updated yet (attempt ${attempt}/${maxAttempts}), waiting ${waitMs / 1000}s`);
                    console.info(`[MarketingTaskProcessor] lastTaskKey=${taskKey} has not updated yet (attempt ${attempt}/${maxAttempts}), waiting ${waitMs / 1000}s`);
                    await new Promise((resolve) => setTimeout(resolve, waitMs));
                    return true;
                }
                console.error(`[MarketingTaskProcessor] lastTaskKey=${taskKey} eventually not updated (attempt ${attempt}/${maxAttempts})`);
                //await logger.error(`[MarketingTaskProcessor] lastTaskKey=${taskKey} eventually not updated (attempt ${attempt}/${maxAttempts})`);
                return false;
            }
            console.log("first task: ", firstTask);
            // // For create_place or create_clone, skip if place with this task key already exists.
            // if (taskVal.payload.tag === 1 || taskVal.payload.tag === 2) {
            //   const payload = taskVal.payload;
            //   // stop if key exists in db
            //   const existing = await placesRepository.getPlaceByTaskKey(taskKey);
            //   if (existing) {
            //       if (existing.addr == "00")
            //       {
            //         await logger.info("addr data not set");
            //       }
            //     await logger.error(`[MarketingTaskProcessor] skipping task key=${taskKey} because place already exists`);
            //     return false;
            //   }
            //   // get root place
            //   const rootPlace = await this.findRootPlace(taskVal.m, taskVal.profile);
            //   if (!rootPlace) {
            //     await logger.error(`[MarketingTaskProcessor] unable to resolve root place for profile ${this.toFriendly(taskVal.profile)} (m=${taskVal.m}, task key=${taskKey})`);
            //     return false;
            //   }
            //   await logger.info(`[MarketingTaskProcessor] resolved root place for profile ${this.toFriendly(taskVal.profile)} (m=${taskVal.m}): address = ${rootPlace.addr}`);
            //   // look for the parent
            //   let parentRow: PlaceRow;
            //   if (payload.tag === 1 && payload.pos) {  
            //       const parentAddr = this.toFriendly(payload.pos.parent);
            //       const pos = payload.pos.pos;
            //       await logger.info(`[MarketingTaskProcessor] fixed pos is set for create_place to addr = ${parentAddr} (task key=${taskKey}`);
            //       const fixedparent = await placesRepository.getPlaceByAddress(parentAddr);
            //       if (!fixedparent)
            //       {
            //           await logger.error(`[MarketingTaskProcessor] fixedparent cannot be find (task key=${taskKey})`);
            //           await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //           await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
            //           await logger.info('----------------------------------------------------------------------');
            //           return true;
            //       }
            //       if (fixedparent.filling >= 2)
            //       {
            //           await logger.error(`[MarketingTaskProcessor] fixedparent is full (task key=${taskKey})`);
            //           await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //           await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
            //           await logger.info('----------------------------------------------------------------------');
            //           return true;
            //       }
            //       if (fixedparent.m != taskVal.m)
            //       {
            //           await logger.error(`[MarketingTaskProcessor] fixedparent is in the different matrix (task key=${taskKey})`);
            //           await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //           await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
            //           await logger.info('----------------------------------------------------------------------');
            //           return true;
            //       }
            //       if (!fixedparent.mp.startsWith(rootPlace.mp))
            //       {
            //           await logger.error(`[MarketingTaskProcessor] fixedparent is in the different structure (task key=${taskKey})`);
            //           await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //           await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
            //           await logger.info('----------------------------------------------------------------------');
            //           return true;
            //       }
            //       if (pos==0 && fixedparent.filling == 1)
            //       {
            //           await logger.error(`[MarketingTaskProcessor] selected pos is already taken (task key=${taskKey})`);
            //           await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //           await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
            //           await logger.info('----------------------------------------------------------------------');
            //           return true;
            //       }
            //       if (pos==1 && fixedparent.filling == 0)
            //       {
            //           await logger.error(`[MarketingTaskProcessor] selected pos = 1 when 0 is empty yet (task key=${taskKey})`);
            //           await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //           await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
            //           await logger.info('----------------------------------------------------------------------');
            //           return true;
            //       }
            //       await logger.info(`[MarketingTaskProcessor] parent position for profile ${this.toFriendly(taskVal.profile)} (m=${taskVal.m}): address= ${fixedparent.addr}`);
            //       parentRow = fixedparent;
            //   }
            //   else
            //   {
            //       // get next pos
            //       const locks = await locksRepository.getLocks(rootPlace.m, rootPlace.profile_addr, 1, Number.MAX_SAFE_INTEGER);
            //       const nextPos = await findNextPos(rootPlace, locks.items);
            //       if (!nextPos) {
            //         await logger.error(`[MarketingTaskProcessor] next position not found for profile ${this.toFriendly(taskVal.profile)} (m=${taskVal.m})`);
            //         return false;
            //       }
            //       await logger.info(`[MarketingTaskProcessor] next position for profile ${this.toFriendly(taskVal.profile)} (m=${taskVal.m}): address= ${nextPos.addr} pos=${nextPos.pos}`);
            //       parentRow = nextPos;
            //   }
            //   // get parent data BEFORE adding the child
            //   const parentDataBefore = await fetchPlaceData(parentRow.addr);
            //   // create place
            //   const createResult = await this.createPlaceFromTask(taskKey, taskVal, parentRow);
            //   const info: PlaceInfo = {
            //     kind: createResult.clone,
            //     profileAddress: taskVal.profile,
            //     placeNumber: createResult.place_number,
            //     inviterProfileAddress: createResult.inviter_profile_addr ? 
            //       Address.parse(createResult.inviter_profile_addr) : 
            //       null,
            //   };
            //   // send deploy
            //   const parentAddress = Address.parse(parentRow.addr);
            //   const deployBody = Multi.deployPlaceMessage(taskKey, parentAddress, info, taskVal.query_id);
            //   await sendPaymentToMulti(rawMultiAddress, taskKey, deployBody, toNano("0.5"));
            //   await logger.info(`[MarketingTaskProcessor] sent 0.5 TON from processor wallet to multi for task key=${taskKey}`);
            //   // waif until new place data appears
            //   const newChildAddr = await waitForNewChild(parentRow.addr, parentDataBefore);
            //   if (!newChildAddr)
            //   {
            //       await logger.error(`[MarketingTaskProcessor] could not get the new child's data of parent ${parentRow.addr}`);
            //       return false;
            //   }
            //   // confirm data in db
            //   await placesRepository.updatePlaceAddressAndConfirm(createResult.id, newChildAddr!);
            //   await logger.info(`[MarketingTaskProcessor] updated place #${createResult.id} with on-chain address ${newChildAddr} and confirmed`);
            // }
            // else if (taskVal.payload.tag === 3) {
            //     const lockPosPayload = taskVal.payload as MultiTaskLockPosPayload;
            //     const placeAddr = this.toFriendly(lockPosPayload.pos.parent);
            //     const lockedPos = lockPosPayload.pos.pos;
            //     // validation
            //     const profileData = await fetchProfileData(taskVal.profile);
            //     if (!profileData || !profileData.owner)
            //     {
            //       await this.logLockErr("failed to load profile data", taskKey, taskVal);
            //       await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //       return false;
            //     }
            //     if (this.toFriendly(lockPosPayload.source) != this.toFriendly(profileData.owner))
            //     {
            //       await this.logLockErr("unauthorized sender", taskKey, taskVal);
            //       await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //       return false;
            //     }
            //     const rootPlace = await this.findRootPlace(taskVal.m, taskVal.profile);
            //     if (!rootPlace)
            //     {
            //         await this.logLockErr("failed to fetch root place", taskKey, taskVal);
            //         await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //         return false;
            //     }
            //     const placeRow = await placesRepository.getPlaceByAddress(placeAddr);
            //     if (!placeRow)
            //     {
            //         await this.logLockErr("failed to get place", taskKey, taskVal);
            //         await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //         return false;
            //     }
            //     if (placeRow.m != taskVal.m)
            //     {
            //         await this.logLockErr(`place is in the diff matrix`, taskKey, taskVal);
            //         await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //         return true;
            //     }
            //     if (!placeRow.mp.startsWith(rootPlace.mp))
            //     {
            //         await this.logLockErr("place is in the diff subtree", taskKey, taskVal);
            //         await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //         return false;
            //     }
            //     if (placeRow.filling == 0)
            //     {
            //         await this.logLockErr("empty place", taskKey, taskVal);
            //         await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //         return false;
            //     }
            //     const profileAddr = this.toFriendly(taskVal.profile);
            //     const existingLock = await locksRepository.getLockByPlaceAddrAndLockedPos(placeAddr, lockedPos, profileAddr);
            //     if (existingLock)
            //     {
            //         await this.logLockErr(`duplicate lock`, taskKey, taskVal);
            //         await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //         await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
            //         await logger.info('----------------------------------------------------------------------');
            //         return true;
            //     }
            //     const otherPosLock = await locksRepository.getLockByPlaceAddrAndLockedPos(placeAddr, lockedPos == 0 ? 1 : 0, profileAddr);
            //     if (otherPosLock)
            //     {
            //         await this.logLockErr(`sibling pos is already locked`, taskKey, taskVal);
            //         await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //         return false;
            //     }
            //     // processing
            //     const createResult = await this.createLockFromTask(taskKey, taskVal, placeRow, lockedPos);
            //     await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //     await locksRepository.updateLockConfirm(createResult.id);
            //     await logger.info(`[MarketingTaskProcessor] updated lock #${createResult.id} with confirmed`);
            // }
            // else if (taskVal.payload.tag === 4) {
            //     const unlockPosPayload = taskVal.payload as MultiTaskUnlockPosPayload;
            //     const placeAddr = this.toFriendly(unlockPosPayload.pos.parent);
            //     const lockedPos = unlockPosPayload.pos.pos;
            //     const profileAddr = this.toFriendly(taskVal.profile);
            //     // validation
            //     const profileData = await fetchProfileData(taskVal.profile);
            //     if (!profileData || !profileData.owner)
            //     {
            //       await this.logUnlockErr("failed to load profile data", taskKey, taskVal);
            //       await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //       return false;
            //     }
            //     if (this.toFriendly(unlockPosPayload.source) != this.toFriendly(profileData.owner))
            //     {
            //       await this.logUnlockErr("unauthorized sender", taskKey, taskVal);
            //       await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //       return false;
            //     }
            //     const lock = await locksRepository.getLockByPlaceAddrAndLockedPos(placeAddr, lockedPos, profileAddr);
            //     if (!lock)
            //     {
            //         await this.logUnlockErr("lock not found", taskKey, taskVal);
            //         await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //         await logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
            //         await logger.info('----------------------------------------------------------------------');
            //         return true;
            //     }
            //     await this.cancelTask(rawMultiAddress, taskKey, taskVal);
            //     await locksRepository.removeLock(lock.id);
            //     await logger.info(`[MarketingTaskProcessor] removed lock #${lock.id}`);
            // }
            // else 
            // {
            //   await logger.error(`[MarketingTaskProcessor] unsupported tag (key = ${taskKey})`);
            //   return false;
            // }
            await logger_1.logger.info(`[MarketingTaskProcessor] last task key=${taskKey} successfully processed`);
            await logger_1.logger.info('----------------------------------------------------------------------');
            return true;
        }
        catch (error) {
            await logger_1.logger.error(`[MarketingTaskProcessor] failed to process last task: ${error}`);
            return false;
        }
    }
}
exports.TaskProcessor = TaskProcessor;
