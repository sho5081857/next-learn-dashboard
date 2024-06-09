import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAccessToken, getApiUrl } from '../apiConfig';
import { Revenue } from '../definitions';
import { UnauthorizedError } from '../errors';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();
  let data = [] as Revenue[];
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    // console.log('Fetching revenue data...');
    // await new Promise((resolve) => setTimeout(resolve, 3000));

    // const data = await sql<Revenue>`SELECT * FROM revenue`;

    const apiUrl = await getApiUrl();
    const token = await getAccessToken();

    const res = await fetch(apiUrl + '/revenues', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    // console.log('Data fetch completed after 3 seconds.');

    if (!res.ok) {
      if (res.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error('Failed to fetch revenue data.');
    }
    data = await res.json();
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      redirect('/sign-out');
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('An unknown error occurred. Error details: ', error);
    }
  }
  return data;
}
