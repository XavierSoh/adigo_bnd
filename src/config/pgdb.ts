import  pgp, { IDatabase }  from 'pg-promise' ;
import * as dotenv from 'dotenv'; 
dotenv.config();

const pgpDb  =   pgp(
  {
    schema:'public'
  }
  /*{
  query(e) {
      console.log('QUERY>:', e.query);
      if (e.params) {
          console.log('PARAMS>:', e.params);
      }
  }
}*/)({
    user: process.env.DB_USER || '',
    host: process.env.DB_HOST || '',
    database: process.env.DB_DATABASE || '',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '5432'),
    

  });




export default pgpDb;