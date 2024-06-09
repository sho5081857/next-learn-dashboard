import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import type { User } from '@/app/lib/definitions';
import { authConfig } from './auth.config';
import type { JWT } from 'next-auth/jwt';
import { getApiUrl } from './app/lib/apiConfig';

// async function getUser(email: string): Promise<User | undefined> {
//   try {
//     const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
//     return user.rows[0];
//   } catch (error) {
//     console.error('Failed to fetch user:', error);
//     throw new Error('Failed to fetch user.');
//   }
// }

const fetchAPI = async (url: string, options: RequestInit) => {
  const apiUrl = await getApiUrl();
  const res = await fetch(`${apiUrl}${url}`, options);

  if (!res.ok) {
    throw new Error('Failed to fetch data from the API');
  }
  return res.json();
};

const verifyAccessToken = async (token: JWT) => {
  const apiUrl = await getApiUrl();
  const res = await fetch(`${apiUrl}/token/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.accessToken}`,
    },
  });
  return res.ok;
};

const refreshAccessToken = async (token: JWT) => {
  const { access_token } = await fetchAPI('/token/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: token.refreshToken }),
  });
  return {
    accessToken: access_token,
    refreshToken: token.refreshToken,
  };
};

const authorizeUser = async (email: string, password: string) => {
  const user = await fetchAPI('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return user;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          return authorizeUser(email, password);
        }
        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: any }) {
      if (user) {
        token.accessToken = (user as User).access_token;
        token.refreshToken = (user as User).refresh_token;
        return token;
      }
      if (await verifyAccessToken(token)) {
        return token;
      }

      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // JWTトークンをセッションオブジェクトに格納
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
  }
}
