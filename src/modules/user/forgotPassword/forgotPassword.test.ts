import { createTypeormConn } from '../../../utils/createTypeormConn';
import { User } from '../../../entity/User';
import { Connection } from 'typeorm';
import { TestClient } from '../../../utils/TestClient';
import { createForgotPasswordLink } from '../../../utils/createForgotPasswordLink';
import * as Redis from 'ioredis';
import { forgotPasswordLockAccount } from '../../../utils/forgotPasswordLockAccount';
import { forgotPasswordLockedError } from '../login/errorMessages';
import { passwordNotLongEnough } from '../register/errorMessages';
import { expiredKeyError } from './errorMessages';

let conn: Connection;
const redis = new Redis();
const email = 'ivan@gmail.com';
const password = 'jiqirenbinbgi';
const newPassword = 'djawoijdao';
let userId: string;

beforeAll(async () => {
  conn = await createTypeormConn();
  const user = await User.create({
    email,
    password,
    confirmed: true,
  }).save();
  userId = user.id;
});

afterAll(async () => {
  conn.close();
});

describe('forgot password', async () => {
  test('make sure it works', async () => {

    const client = new TestClient(process.env.TEST_HOST as string);

    // lock account
    await forgotPasswordLockAccount(userId, redis);
    const url = await createForgotPasswordLink('', userId, redis);
   
    const parts = url.split('/');
    const key = parts[parts.length - 1];

    // make sure you can't login to locked account
    expect(await client.login(email, password)).toEqual({
      data: {
        login: [{
          path: 'email',
          message: forgotPasswordLockedError,
        }],
      },
    });

    // try changing to a password that's too short
    expect(await client.forgotPasswordChange('a', key)).toEqual({
      data: {
        forgotPasswordChange: [{
          path: 'newPassword',
          message: passwordNotLongEnough,
        }],
      },
    });

    const res = await client.forgotPasswordChange(newPassword, key);
    
    expect(res.data).toEqual({
      forgotPasswordChange: null,
    });

    // make sure redis key expires after password change
    expect(await client.forgotPasswordChange('sjojqoijdoqdw', key)).toEqual({
      data: {
        forgotPasswordChange: [{
          path: 'key',
          message: expiredKeyError,
        }],
      },
    })

    expect(await client.login(email, newPassword)).toEqual({
      data: {
        login: null,
      },
    });
  });
});