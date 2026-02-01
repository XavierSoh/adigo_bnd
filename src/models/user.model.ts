export type UserJSON = {
  token?:string;
  id?: number ;
  login: string;
  password: string;
  phone?: string;
  creation_date?: Date;
  profile?: number;
  staff?: number;
  super_u?: string;
  account_status?: 'deleted' | 'disabled' | 'enabled';
  is_deleted?: boolean;
  deleted_at?: Date;
  deleted_by?: number;
  user_name?:string, 
  is_online?:boolean,
  role?: 'admin' | 'teacher' | 'student' | 'parent' | 'guest'; 
  language?:'fr' | 'en';
};

export default class UserModel {
  constructor({  
     token,
    id,
    login,
    password,
    phone,
    creation_date,
    profile,
    staff,
    super_u,
    account_status,
    is_deleted,
    deleted_at,
    deleted_by,
    user_name, 
    is_online, 
    role , 
    language,
 

  }: UserJSON) {
    this.token= token;
    this.id = id??null; 
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
    this.role =role; // Default role
    this.language = language
  }

  token?:string;
  id?: number;
  login: string;
  password: string;
  phone?: string;
  creation_date?: Date;
  profile?: number;
  staff?: number;
  super_u?: string;
  account_status?: 'deleted' | 'disabled' | 'enabled';
  is_deleted?: boolean;
  deleted_at?: Date;
  deleted_by?: number;
  user_name?:string
  is_online?:boolean;
  role?: 'admin' | 'teacher' | 'student' | 'parent' | 'guest';
  language: 'fr' | 'en';
 
  static fromJson(json: UserJSON): UserModel {
    return new UserModel(json);
  }
}
