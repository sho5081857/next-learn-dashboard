import { getApiUrl } from '@/app/lib/apiConfig';
import { UnauthorizedError } from '@/app/lib/errors';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const apiUrl = await getApiUrl();
  const token = req.headers.get('Authorization');
  const { id } = params;
  try {
    const res = await fetch(apiUrl + '/invoices/' + id, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error(
        'Failed to fetch invoice with id ' + id + ' with status: ' + res.status,
      );
    }

    const data = await res.json();

    return Response.json(data);
  } catch (error: unknown) {
    let message = 'An unknown error occurred.';
    let status = 500;

    if (error instanceof UnauthorizedError) {
      status = 401;
      message = `Unauthorized: ${error.message}`;
    } else if (error instanceof Error) {
      message = `Error: ${error.message}`;
    }

    return new Response(message, {
      status: status,
    });
  }
}
