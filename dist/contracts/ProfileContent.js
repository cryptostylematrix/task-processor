"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnChainString = OnChainString;
exports.nftContentToCell = nftContentToCell;
const core_1 = require("@ton/core");
const crypto_1 = require("@ton/crypto");
function OnChainString() {
    return {
        serialize(src, builder) {
            builder.storeRef((0, core_1.beginCell)().storeUint(0, 8).storeStringTail(src));
        },
        parse(src) {
            const sc = src.loadRef().beginParse();
            const tag = sc.loadUint(8);
            if (tag == 1) {
                return sc.loadStringTail();
            }
            else if (tag == 0) {
                // Not really tested, but feels like it should work
                const chunkDict = core_1.Dictionary.loadDirect(core_1.Dictionary.Keys.Uint(32), core_1.Dictionary.Values.Cell(), sc);
                return chunkDict.values().map(x => x.beginParse().loadStringTail()).join('');
            }
            else {
                throw Error(`Prefix ${tag} is not supported yet!`);
            }
        }
    };
}
function nftContentToCell(content) {
    if (content.type == 'offchain') {
        return (0, core_1.beginCell)()
            .storeUint(1, 8)
            .storeStringRefTail(content.uri) //Snake logic under the hood
            .endCell();
    }
    let keySet = new Set(['uri', 'name', 'description', 'image', 'image_data', 'symbol', 'decimals', 'amount_style', 'render_type', 'currency', 'game', 'content_type', 'content_url', 'lottie', 'attributes']);
    let contentDict = core_1.Dictionary.empty(core_1.Dictionary.Keys.Buffer(32), OnChainString());
    for (let contentKey in content.data) {
        if (keySet.has(contentKey)) {
            contentDict.set((0, crypto_1.sha256_sync)(contentKey), content.data[contentKey]);
        }
    }
    let result = (0, core_1.beginCell)().storeUint(0, 8).storeDict(contentDict).endCell();
    return result;
}
