"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = exports.Op = void 0;
class Op {
}
exports.Op = Op;
Op.transfer = 0xf8a7ea5;
Op.transfer_notification = 0x7362d09c;
Op.internal_transfer = 0x178d4519;
Op.jetton_excesses = 0xd53276db;
Op.buy_place = 0xbe490d70;
Op.deploy_place = 0xce2879c7;
Op.pay_bonus = 0x7db363d2;
Op.cancel_task = 0x02b82976;
Op.excesses = 0xd7288b26;
Op.refund = 0x0959101f;
Op.update_maxtasks = 0x6d0d19c0;
Op.upgrade = 0x53c57870;
Op.proxy = 0xa11cdbe3;
Op.place_added = 0xa234ad9c;
Op.add_child = 0xb62c4644;
Op.bonus = 0x39cb9dfb;
Op.lock_pos = 0x936ecf92;
Op.unlock_pos = 0xce87058b;
Op.update_admin = 0x812e7b6a;
Op.update_processor = 0x80c163d5;
Op.update_fees = 0x0334f47d;
class Errors {
}
exports.Errors = Errors;
Errors.bad_request = 400;
Errors.unauthorized = 401;
Errors.insufficient_funds = 402;
Errors.forbidden = 403;
Errors.not_found = 404;
