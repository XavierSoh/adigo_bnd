"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UserModel {
    constructor({ token, id, login, password, phone, creation_date, profile, staff, super_u, account_status, is_deleted, deleted_at, deleted_by, user_name, is_online, role, language, }) {
        this.token = token;
        this.id = id ?? null;
        this.login = login;
        this.password = password;
        this.phone = phone;
        this.creation_date = creation_date;
        this.profile = profile;
        this.staff = staff;
        this.super_u = super_u;
        this.account_status = account_status;
        this.is_deleted = is_deleted;
        this.deleted_at = deleted_at;
        this.deleted_by = deleted_by;
        this.user_name = user_name;
        this.is_online = is_online;
        this.role = role; // Default role
        this.language = language;
    }
    static fromJson(json) {
        return new UserModel(json);
    }
}
exports.default = UserModel;
