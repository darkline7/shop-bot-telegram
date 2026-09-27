import 'dotenv/config';

import { PrismaClient, AdminRole } from '@shop/database'; import jwt from 'jsonwebtoken'; import crypto from 'node:crypto'; import { Request, Response, NextFunction } from 'express';
export const db=new PrismaClient(); export const accessSecret=process.env.JWT_SECRET||'dev-secret'; export const refreshSecret=process.env.JWT_REFRESH_SECRET||'dev-refresh';
export type AuthRequest=Request&{admin?:{id:string;role:AdminRole;username:string}};
export const fail=(res:Response,code:string,message:string,status=400)=>res.status(status).json({success:false,error:{code,message}}); export const ok=(res:Response,data:unknown)=>res.json({success:true,data});
export const sign=(a:{id:string;role:AdminRole;username:string})=>jwt.sign(a,accessSecret,{expiresIn:'15m'});
export const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
export function auth(req:AuthRequest,res:Response,next:NextFunction){try{req.admin=jwt.verify((req.headers.authorization||'').replace('Bearer ','').trim(),accessSecret) as AuthRequest['admin'];next()}catch{fail(res,'UNAUTHORIZED','Authentication required',401)}}
export const roles=(...r:AdminRole[])=>(req:AuthRequest,res:Response,next:NextFunction)=>req.admin&&r.includes(req.admin.role)?next():fail(res,'FORBIDDEN','Insufficient permission',403);
export async function audit(req:AuthRequest,action:string,entity:string,entityId?:string,data?:unknown){await db.auditLog.create({data:{adminId:req.admin?.id,action,entity,entityId,newData:data as any,ip:req.ip,userAgent:req.get('user-agent')}})}
