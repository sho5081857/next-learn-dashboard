import { auth } from '@/auth';
import { UnauthorizedError } from './errors';

export async function getApiUrl() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error('API_URL is not defined.');
  }
  return apiUrl;
}

export async function getAccessToken() {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) {
    throw new UnauthorizedError();
  }
  return token;
}

export async function getNextPublicApiUrl() {
  const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!nextPublicApiUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is not defined.');
  }
  return nextPublicApiUrl;
}
