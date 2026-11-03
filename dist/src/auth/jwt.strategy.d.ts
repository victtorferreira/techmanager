import { Strategy } from 'passport-jwt';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor();
    validate(payload: {
        sub: string;
        tenantId: string;
        role: string;
        email: string;
    }): {
        userId: string;
        tenantId: string;
        role: string;
        email: string;
    };
}
export {};
