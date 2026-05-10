"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = exports.ItemOp = exports.CollectionOp = void 0;
class CollectionOp {
}
exports.CollectionOp = CollectionOp;
CollectionOp.deploy_item = 1;
CollectionOp.change_owner = 3;
CollectionOp.change_content = 4;
CollectionOp.withdraw = 5;
class ItemOp {
}
exports.ItemOp = ItemOp;
ItemOp.transfer = 0x5fcc3d14;
ItemOp.ownership_assigned = 0x05138d91;
ItemOp.excesses = 0xd53276db;
ItemOp.edit_content = 0x1a0b9d51;
ItemOp.get_static_data = 0x2fcb26a2;
ItemOp.report_static_data = 0x8b771735;
ItemOp.choose_inviter = 0xef27e2d6;
ItemOp.add_referal = 0x7a3eae1c;
ItemOp.report_of_invite = 0x5cdb127e;
ItemOp.bonus = 0x39cb9dfb;
ItemOp.withdraw = 0xCb03bfaf;
ItemOp.proxy = 0xd5212b3f;
class Errors {
}
exports.Errors = Errors;
Errors.invalid_sender = 401;
Errors.invalid_index = 402;
Errors.invalid_payload = 708;
Errors.not_enough_gas = 402;
Errors.forbidden = 403;
Errors.uninit = 405;
