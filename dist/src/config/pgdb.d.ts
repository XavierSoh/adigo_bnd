import pgp from 'pg-promise';
declare const pgpDb: pgp.IDatabase<{}, import("pg-promise/typescript/pg-subset").IClient>;
export default pgpDb;
