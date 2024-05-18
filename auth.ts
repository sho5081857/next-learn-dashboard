import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import type { User } from '@/app/lib/definitions';
import { authConfig } from './auth.config';
import axios from 'axios';

// async function getUser(email: string): Promise<User | undefined> {
//   try {
//     const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
//     return user.rows[0];
//   } catch (error) {
//     console.error('Failed to fetch user:', error);
//     throw new Error('Failed to fetch user.');
//   }
// }

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;

          // 外部APIにリクエストを送信
          const apiUrl = process.env.API_URL;
          if (!apiUrl) {
            throw new Error('API_URL is not defined.');
          }

          const response = await axios.post(apiUrl + '/login', {
            email,
            password,
          });
          // レスポンスをチェック
          if (response.status >= 200 && response.status < 300) {
            // ユーザー情報を返す
            return {
              email: response.data.email,
              name: response.data.name,
              accessToken: response.data.access_token,
            };
          }
        }
        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // User is available during sign-in
        token.accessToken = (user as User).accessToken;
      }
      return token;
    },
    session({ session, token }) {
      // JWTトークンをセッションオブジェクトに格納
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});
declare module 'next-auth' {
  /**
   * Session オブジェクトにカスタムプロパティを追加
   */
  interface Session {
    accessToken?: string;
  }
}
