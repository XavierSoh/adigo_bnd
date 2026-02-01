export default interface ResponseModel {
    code:number;
    status:boolean;
    message:string;
    body?:Object;
    exception?:any;
    token?:string;
   
}