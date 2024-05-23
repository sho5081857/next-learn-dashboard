import { auth } from '@/auth';
import { redirect } from 'next/navigation';
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
