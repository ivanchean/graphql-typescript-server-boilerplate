import { createTypeormConn } from '../../utils/createTypeormConn';
import { User } from '../../entity/User';
import { Connection } from '../../../node_modules/typeorm';
import { TestClient } from '../../utils/TestClient';
import { createForgotPasswordLink } from '../../utils/createForgotPasswordLink';
import * as Redis from 'ioredis';

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
    // computer 1
    const client = new TestClient(process.env.TEST_HOST as string);

    const url = await createForgotPasswordLink('', userId, redis);
    const parts = url.split('/');
    const key = parts[parts.length - 1];

    const res = await client.forgotPasswordChange(newPassword, key);
    expect(res.data).toEqual({
      forgotPasswordChange: null,
    });

    expect(await client.login(email, newPassword)).toEqual({
      data: {
        login: null,
      },
    });
  });
});