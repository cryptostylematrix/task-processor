export abstract class Op {
    static transfer = 0xf8a7ea5;
    static transfer_notification = 0x7362d09c;
    static internal_transfer = 0x178d4519;
    static jetton_excesses = 0xd53276db;
    
    static buy_place = 0xbe490d70;
    static deploy_place = 0xce2879c7;
    static pay_bonus = 0x7db363d2;
    static cancel_task = 0x02b82976;
    static excesses = 0xd7288b26;
    static refund = 0x0959101f;
    static update_maxtasks = 0x6d0d19c0;
    static upgrade = 0x53c57870; 
    static proxy = 0xa11cdbe3;
    static place_added = 0xa234ad9c;
    static add_child = 0xb62c4644;
    static bonus = 0x39cb9dfb;
    static lock_pos = 0x936ecf92;
    static unlock_pos = 0xce87058b;
    static update_admin = 0x812e7b6a;
    static update_processor = 0x80c163d5;
    static update_fees = 0x0334f47d;
}

export abstract class Errors {
    static bad_request = 400;
    static unauthorized = 401;
    static insufficient_funds = 402; 
    static forbidden = 403;
    static not_found = 404;
}